import { CODES } from './desk-constants.js';
import { heightConverter } from './height-converter.js';
import { sleep } from '../shared/helpers.js';
import { storeKeys } from '../store-keys.js';

const BufferFrom = Buffer.from;

// Desk height limits in meters
const MIN_HEIGHT = 0.62;
const MAX_HEIGHT = 1.27;

export class DeskController {
  constructor (desk, store) {
    this.desk = desk;
    this.store = store;
    this._isMoving = false;
  }

  setHeightToleranceThreshold = (heightToleranceThreshold) => {
    this.store.addWithOverwrite(storeKeys.DEFAULT_HEIGHT_TOLERANCE_THRESHOLD, heightToleranceThreshold);
  }

  moveUpAsync = async () => {
    await this.desk.characteristics.move.writeAsync(new BufferFrom(CODES.up, 'hex'), false);
    // TODO: add check for speed to resolve?
  }

  moveDownAsync = async () => {
    await this.desk.characteristics.move.writeAsync(new BufferFrom(CODES.down, 'hex'), false);
    // TODO: add check for speed to resolve?
  }

  preflightRequestAsync = async () => {
    const preflightTimeDuration = this.store.get(storeKeys.PREFLIGHT_TIME_DURATION);

    await this.desk.characteristics.move.writeAsync(new BufferFrom(CODES.preflight, 'hex'), false);
    await sleep(this.preflightTimeDuration || preflightTimeDuration);
  }

  moveToAsync = async (requestedHeight) => {
    // Validate height is within safe range
    if (requestedHeight < MIN_HEIGHT || requestedHeight > MAX_HEIGHT) {
      throw new Error(`Requested height ${requestedHeight}m is outside safe range [${MIN_HEIGHT}m - ${MAX_HEIGHT}m]`);
    }

    // Prevent concurrent movement operations
    if (this._isMoving) {
      throw new Error('Desk is already moving. Wait for current movement to complete.');
    }

    try {
      this._isMoving = true;
      const moveLoop = await this.getMoveLoop(requestedHeight);
      await this.preflightRequestAsync();
      return await moveLoop();
    } finally {
      this._isMoving = false;
    }
  }

  getMoveLoop = async (requestedHeight) => {
    const shouldStopMoving = await this.getShouldStopMoving(requestedHeight);
    const moveTimeDuration = this.store.get(storeKeys.MOVE_TIME_DURATION);
    const requestedHeightHex = heightConverter.toHexReversed(requestedHeight);

    return async () => new Promise((resolve, reject) => {
      let hasStartedMoving = false;

      this.moveToIntervalId = setInterval(async () => {
        // Read both height and speed for more reliable target detection
        const { height: currentHeightCm, speed } = await this.desk.getCurrentHeightAndSpeedAsync();
        const currentHeight = currentHeightCm / 100; // Convert cm to meters

        console.log(`Current: ${currentHeightCm.toFixed(2)}cm, Target: ${(requestedHeight*100).toFixed(2)}cm, Speed: ${(speed*100).toFixed(4)}cm/s`);

        // Track if desk has started moving
        if (Math.abs(speed) > 0.0001) {
          hasStartedMoving = true;
        }

        // Stop if desk speed is 0 (desk has stopped moving) or height condition met
        const heightConditionMet = shouldStopMoving(currentHeight, requestedHeight);
        const deskHasStopped = Math.abs(speed) < 0.0001; // Speed effectively 0

        if (heightConditionMet || (hasStartedMoving && deskHasStopped && this.isDifferenceInThreshold(currentHeight, requestedHeight))) {
          clearInterval(this.moveToIntervalId);
          this._isMoving = false;
          resolve();
          return;
        }

        await this.moveAsync(requestedHeightHex);
      }, moveTimeDuration);
    });
  }

  stopAsync = async () => {
    clearInterval(this.moveToIntervalId);
    // Send both stop commands for reliable stopping
    await Promise.all([
      this.desk.characteristics.move.writeAsync(new BufferFrom(CODES.stop, 'hex'), false),
      this.desk.characteristics.moveTo.writeAsync(new BufferFrom(CODES.referenceInputStop, 'hex'), false)
    ]);
    this._isMoving = false;
  }

  moveAsync = async (requestedHeight) => {
    const heightForTransmission = new BufferFrom(requestedHeight, 'hex');
    await this.desk.characteristics.moveTo.writeAsync(heightForTransmission, false);
  }

  getShouldStopMoving = async (requestedHeight) => {
    // Fixed: When current < requested, we're moving UP (need to go higher)
    // When current > requested, we're moving DOWN (need to go lower)
    const currentHeightCm = await this.desk.getCurrentHeightAsync();
    const currentHeight = currentHeightCm / 100; // Convert cm to meters
    const isMovingUp = currentHeight < requestedHeight;
    return isMovingUp
      ? this.shouldStopMovingUp
      : this.shouldStopMovingDown;
  }

  shouldStopMovingUp = (current, requested) => {
    if (this.isDifferenceInThreshold(current, requested)) return true;
    // Fixed: Stop when current height reaches or exceeds requested height
    return current >= requested;
  }

  shouldStopMovingDown = (current, requested) => {
    if (this.isDifferenceInThreshold(current, requested)) return true;
    // Stop when current height reaches or goes below requested height
    return current <= requested;
  };

  isDifferenceInThreshold (current, requested) {
    const heightToleranceThreshold = this.store.get(storeKeys.DEFAULT_HEIGHT_TOLERANCE_THRESHOLD);
    return Math.abs(current - requested) < heightToleranceThreshold;
  }
};
