import { heightConverter } from './height-converter';
import { deskHelpers } from './desk-helpers';

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

  setCustomPreflight = (preflightTimeDuration) => {
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

  disconnectAsync = async () => {
    await this.peripheral.disconnectAsync();
    console.log('\nDesk disconnected');
  }
};
