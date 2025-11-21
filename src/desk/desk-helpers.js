import { CHARACTERISTICS } from './desk-constants.js';

class DeskHelpers {
  getHeightCharacteristic = (characteristics) => {
    return this.getCharacteristicByUUID(characteristics, CHARACTERISTICS.height.uuidNoDashesLowCase);
  }

  getMoveCharacteristic = (characteristics) => {
    return this.getCharacteristicByUUID(characteristics, CHARACTERISTICS.move.uuidNoDashesLowCase);
  }

  getMoveToCharacteristic = (characteristics) => {
    return this.getCharacteristicByUUID(characteristics, CHARACTERISTICS.moveTo.uuidNoDashesLowCase);
  }

  getCharacteristicByUUID = (characteristics, uuid) => {
    return characteristics.find((characteristic) => {
      return characteristic.uuid === uuid;
    });
  }

  createSimplePeripheral = (peripheral) => {
    return {
      name: peripheral.advertisement.localName,
      address: peripheral.address,
      uuid: peripheral.uuid
    };
  }

  shouldPush = (currentItems, itemToPush) => {
    // Check if device has advertisement data
    if (!itemToPush.advertisement) return false;
    // Allow devices even without localName (they might still be connectable)
    // if (!itemToPush.advertisement.localName) return false;
    // Avoid duplicates
    if (currentItems.some((item) => item.uuid === itemToPush.uuid)) return false;
    return true;
  }
};

export const deskHelpers = new DeskHelpers();
