import {CODES} from './desk-constants'
import {heightConverter} from './height-converter';
import {sleep} from './helpers';

export class Desk{
  constructor(peripheral){
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
    await this.moveCharacteristic.writeAsync(new Buffer.from(CODES.up, 'hex'), false);
  }

  moveDown = async () => {
    await this.moveCharacteristic.writeAsync(new Buffer.from(CODES.down, 'hex'), false);
  }

  preflightRequest = async () => {
    await this.moveCharacteristic.writeAsync(new Buffer.from(CODES.preflight, 'hex'), false);
    await sleep(100);
  }

  moveTo = async (requestedHeight) => {
    const isMovingUp = await this.getCurrentHeight() > requestedHeight;
    const requestedHeightHex = heightConverter
      .getHexRepresentation(heightConverter
        .getAbsoluteHeight(heightConverter
          .toMilimeters(requestedHeight)));
    
    const shouldStopMoving = isMovingUp
      ? (current, requested) => current <= requested
      : (current, requested) => current >= requested

    return new Promise(async (resolve, reject) => {
      await this.preflightRequest();
      this.moveToIntervalId = setInterval( async () => {
        const currentHeight = await this.getCurrentHeight();
        console.log({currentHeight});
        if(shouldStopMoving(currentHeight, requestedHeight)){
          clearInterval(this.moveToIntervalId);
          resolve();
        }
        this.move(requestedHeightHex);
      }, 500)
    });
  }

  stop = async () => {
    clearInterval(this.moveToIntervalId);
    await this.moveCharacteristic.writeAsync(new Buffer.from(CODES.stop, 'hex'), false);
  }

  move = async (requestedHeight) => {
    const heightForTransmission = new Buffer.from(requestedHeight, 'hex');
    await this.moveToCharacteristic.writeAsync(heightForTransmission, false)
  }

  getCurrentHeightBuffer = async () => {
    return await this.heightCharacteristic.readAsync();
  }

  getCurrentHeight = async () => {
    const heightInBytes = await this.getCurrentHeightBuffer();
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
