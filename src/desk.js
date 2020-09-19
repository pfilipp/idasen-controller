import { CODES } from './desk-constants';
import { heightConverter } from './height-converter';
import { sleep } from './helpers';

const BufferFrom = Buffer.from;

const PREFLIGHT_TIME_DURATION = 200;
const MOVE_TIME_DURATION = 500;

export class Desk {
  constructor (peripheral) {
    this.peripheral = peripheral;

    this.moveToCharacteristic = null;
    this.heightCharacteristic = null;
    this.moveCharacteristic = null;
    this.moveToIntervalId = null;
  }

  setCharacteristic = (name, characteristic) => {
    this[name] = characteristic;
  }

  setCustomPreflight = (preflightTimeDuration) => {
    this.preflightTimeDuration = preflightTimeDuration;
  }

  moveUpAsync = async () => {
    await this.moveCharacteristic.writeAsync(new BufferFrom(CODES.up, 'hex'), false);
    // TODO: add check for speed to resolve?
  }

  moveDownAsync = async () => {
    await this.moveCharacteristic.writeAsync(new BufferFrom(CODES.down, 'hex'), false);
    // TODO: add check for speed to resolve?
  }

  preflightRequestAsync = async () => {
    await this.moveCharacteristic.writeAsync(new BufferFrom(CODES.preflight, 'hex'), false);
    await sleep(this.preflightTimeDuration || PREFLIGHT_TIME_DURATION);
  }

  moveToAsync = async (requestedHeight) => {
    const moveLoop = await this.getMoveLoop(requestedHeight);
    await this.preflightRequestAsync();
    return moveLoop();
  }

  getMoveLoop = async (requestedHeight) => {
    const shouldStopMoving = await this.getShouldStopMoving(requestedHeight);

    const requestedHeightHex = heightConverter.toHexReversed(requestedHeight);

    return () => new Promise((resolve, reject) => {
      this.moveToIntervalId = setInterval(async () => {
        const currentHeight = await this.getCurrentHeightAsync();
        if (shouldStopMoving(currentHeight, requestedHeight)) {
          clearInterval(this.moveToIntervalId);
          resolve();
        }
        await this.moveAsync(requestedHeightHex);
      }, MOVE_TIME_DURATION);
    });
  }

  stopAsync = async () => {
    clearInterval(this.moveToIntervalId);
    await this.moveCharacteristic.writeAsync(new BufferFrom(CODES.stop, 'hex'), false);
  }

  moveAsync = async (requestedHeight) => {
    const heightForTransmission = new BufferFrom(requestedHeight, 'hex');
    await this.moveToCharacteristic.writeAsync(heightForTransmission, false);
  }

  getCurrentHeightBufferAsync = () => {
    return this.heightCharacteristic.readAsync();
  }

  getCurrentHeightAsync = async () => {
    const heightInBytes = await this.getCurrentHeightBufferAsync();
    const rawHeight = heightConverter.getAbsoluteHeightFromBuffer(heightInBytes);
    const height = heightConverter
      .toCentimeters(heightConverter
        .getRelativeHeight(rawHeight));
    return height;
  }

  disconnectAsync = async () => {
    await this.peripheral.disconnectAsync();
    console.log('\nDesk disconnected');
  }

  getShouldStopMoving = async (requestedHeight) => {
    const isMovingUp = await this.getCurrentHeightAsync() > requestedHeight;
    return isMovingUp
      ? (current, requested) => current <= requested
      : (current, requested) => current >= requested;
  }
};
