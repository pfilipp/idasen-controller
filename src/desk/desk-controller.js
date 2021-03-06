import { CODES } from './desk-constants';
import { heightConverter } from './height-converter';
import { sleep } from '../shared/helpers';
import { storeKeys } from '../store-keys';

const BufferFrom = Buffer.from;

export class DeskController {
  constructor (desk, store) {
    this.desk = desk;
    this.store = store;
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
    const moveLoop = await this.getMoveLoop(requestedHeight);
    await this.preflightRequestAsync();
    return await moveLoop();
  }

  getMoveLoop = async (requestedHeight) => {
    const shouldStopMoving = await this.getShouldStopMoving(requestedHeight);
    const moveTimeDuration = this.store.get(storeKeys.MOVE_TIME_DURATION);
    const requestedHeightHex = heightConverter.toHexReversed(requestedHeight);

    return async () => new Promise((resolve, reject) => {
      this.moveToIntervalId = setInterval(async () => {
        const currentHeight = await this.desk.getCurrentHeightAsync();
        if (shouldStopMoving(currentHeight, requestedHeight)) {
          clearInterval(this.moveToIntervalId);
          resolve();
        }
        await this.moveAsync(requestedHeightHex);
      }, moveTimeDuration);
    });
  }

  stopAsync = async () => {
    clearInterval(this.moveToIntervalId);
    await this.desk.characteristics.move.writeAsync(new BufferFrom(CODES.stop, 'hex'), false);
  }

  moveAsync = async (requestedHeight) => {
    const heightForTransmission = new BufferFrom(requestedHeight, 'hex');
    await this.desk.characteristics.moveTo.writeAsync(heightForTransmission, false);
  }

  getShouldStopMoving = async (requestedHeight) => {
    const isMovingUp = await this.desk.getCurrentHeightAsync() > requestedHeight;
    return isMovingUp
      ? this.shouldStopMovingUp
      : this.shouldStopMovingDown;
  }

  shouldStopMovingUp = (current, requested) => {
    if (this.isDifferenceInThreshold(current, requested)) return true;
    return current < requested;
  }

  shouldStopMovingDown = (current, requested) => {
    if (this.isDifferenceInThreshold(current, requested)) return true;
    return current >= requested;
  };

  isDifferenceInThreshold (current, requested) {
    const heightToleranceThreshold = this.store.get(storeKeys.DEFAULT_HEIGHT_TOLERANCE_THRESHOLD);
    return Math.abs(current - requested) < heightToleranceThreshold;
  }
};
