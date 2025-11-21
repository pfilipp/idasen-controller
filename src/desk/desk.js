import { heightConverter } from './height-converter.js';
import { deskHelpers } from './desk-helpers.js';
import { CODES } from './desk-constants.js';

const BufferFrom = Buffer.from;

export class Desk {
  constructor (peripheral) {
    this.peripheral = peripheral;

    this.characteristics = {
      move: null,
      moveTo: null,
      height: null
    };

    this.moveToIntervalId = null;
  }

  connect = async () => {
    await this.peripheral.connectAsync();
  }

  init = async () => {
    const characteristics = await this.getCharacteristicsAsync(this.peripheral);
    this.setCharacteristics(characteristics);
  }

  setCharacteristic = (name, characteristic) => {
    this.characteristics[name] = characteristic;
  }

  setCustomPreflightDuration = (preflightTimeDuration) => {
    this.preflightTimeDuration = preflightTimeDuration;
  }

  getCharacteristicsAsync = async (peripheral) => {
    const { characteristics } = await peripheral.discoverAllServicesAndCharacteristicsAsync();
    return characteristics;
  }

  setCharacteristics = (characteristics) => {
    console.log('settings characteristics');
    this.setCharacteristic('move', deskHelpers.getMoveCharacteristic(characteristics));
    this.setCharacteristic('height', deskHelpers.getHeightCharacteristic(characteristics));
    this.setCharacteristic('moveTo', deskHelpers.getMoveToCharacteristic(characteristics));

    // Increase max listeners for repeated reads during movement
    this.characteristics.height.setMaxListeners(100);
    this.characteristics.move.setMaxListeners(100);
    this.characteristics.moveTo.setMaxListeners(100);
  }

  getCurrentHeightBufferAsync = () => {
    return this.characteristics.height.readAsync();
  }

  getCurrentHeightAsync = async () => {
    const heightInBytes = await this.getCurrentHeightBufferAsync();
    const rawHeight = heightConverter.getAbsoluteHeightFromBuffer(heightInBytes);
    const height = heightConverter
      .toCentimeters(heightConverter
        .getRelativeHeight(rawHeight));
    return height;
  }

  getCurrentSpeedAsync = async () => {
    const buffer = await this.getCurrentHeightBufferAsync();
    // Speed is in bytes 2-3 of the 4-byte buffer (Int16LE)
    if (buffer.length >= 4) {
      const speedRaw = buffer.readInt16LE(2);
      // Convert to meters per second (same scale as height: divide by 10000)
      return speedRaw / 10000;
    }
    return 0;
  }

  getCurrentHeightAndSpeedAsync = async () => {
    const buffer = await this.getCurrentHeightBufferAsync();

    // Parse height using same logic as getCurrentHeightAsync
    const rawHeight = heightConverter.getAbsoluteHeightFromBuffer(buffer);
    const height = heightConverter
      .toCentimeters(heightConverter
        .getRelativeHeight(rawHeight));

    // Parse speed (bytes 2-3)
    const speed = buffer.length >= 4 ? buffer.readInt16LE(2) / 10000 : 0;

    return { height, speed };
  }

  wakeupAsync = async () => {
    // Send wakeup command for DPG1C controller compatibility
    await this.characteristics.move.writeAsync(new BufferFrom(CODES.wakeup, 'hex'), false);
    console.log('Wakeup command sent');
  }

  disconnectAsync = async () => {
    await this.peripheral.disconnectAsync();
    console.log('\nDesk disconnected');
  }
};
