import { CODES } from './desk-constants';
import { heightConverter } from './height-converter';
import { sleep } from './helpers';

const BufferFrom = Buffer.from;

const PREFLIGHT_TIME_DURATION = 100;
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

  moveUp = async () => {
    await this.moveCharacteristic.writeAsync(new BufferFrom(CODES.up, 'hex'), false);
    // TODO: add check for speed to resolve?
  }

  moveDown = async () => {
    await this.moveCharacteristic.writeAsync(new BufferFrom(CODES.down, 'hex'), false);
    // TODO: add check for speed to resolve?
  }

  preflightRequest = async () => {
    console.log('starting preflight');
    await this.moveCharacteristic.writeAsync(new BufferFrom(CODES.preflight, 'hex'), false);
    await sleep(PREFLIGHT_TIME_DURATION);
    console.log('ending preflight');
  }

  moveTo = async (requestedHeight) => {
    const isMovingUp = await this.getCurrentHeightAsync() > requestedHeight;
    const requestedHeightHex = heightConverter
      .getHexRepresentation(heightConverter
        .getAbsoluteHeight(heightConverter
          .toMilimeters(requestedHeight)));

    const shouldStopMoving = isMovingUp
      ? (current, requested) => current <= requested
      : (current, requested) => current >= requested;

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      await this.preflightRequest();
      this.moveToIntervalId = setInterval(async () => {
        const currentHeight = await this.getCurrentHeightAsync();
        if (shouldStopMoving(currentHeight, requestedHeight)) {
          clearInterval(this.moveToIntervalId);
          resolve();
        }
        console.log('start moving');
        this.move(requestedHeightHex);
      }, MOVE_TIME_DURATION);
    });
  }

  stop = async () => {
    clearInterval(this.moveToIntervalId);
    await this.moveCharacteristic.writeAsync(new BufferFrom(CODES.stop, 'hex'), false);
  }

  move = async (requestedHeight) => {
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

  disconnect = async () => {
    await this.peripheral.disconnectAsync();
    console.log('\nDesk disconnected');
  }
};
