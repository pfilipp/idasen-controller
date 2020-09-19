import noble from '@abandonware/noble';
import { CHARACTERISTICS } from './desk-constants';
import { STATES, ADAPTER_EVENTS, PERIPHERAL_EVENTS } from './noble-constants';
import { Desk } from './desk';
import { sleep } from './helpers';

const managerStateEnum = {
  SCANNING: 'scanning',
  CONNECTING: 'connecting',
  IDLE: 'idle'
};

class DeskManager {
  constructor () {
    this.desk = null;
    this.deskAddress = null;
    this.discoveredPeripherals = [];
    this.isNobleReady = false;
    this.state = managerStateEnum.IDLE;
  }

  init = () => {
    this.setOnStateChangeHandler();
    this.setOnDiscoverHandler();
  }

  scan = async () => {
    this.state = managerStateEnum.SCANNING;
    try {
      await noble.startScanningAsync([], true);
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          await noble.stopScanningAsync();
          this.state = managerStateEnum.IDLE;
          resolve(this.discoveredPeripherals);
        }, 4000);
      });
    } catch (error) {
      return ({ message: 'Unable to scan.' });
    }
  }

  connect = async (address) => {
    this.deskAddress = address;
    this.state = managerStateEnum.CONNECTING;
    await noble.startScanningAsync([], true);
    await sleep(1000); // FIXME: convert to promise
    const result = this.desk
      ? 'success'
      : 'failure';
    this.state = managerStateEnum.IDLE;
    return result;
  }

  disconnect = async () => {
    this.deskAddress = null;
    await this.disconnect();
    this.desk = null;
    return 'success';
  }

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

  getCharacteristics = async (desk) => {
    const { characteristics } = await desk.discoverAllServicesAndCharacteristicsAsync();
    return characteristics;
  }

  createSimplePeripheral = (peripheral) => {
    return {
      name: peripheral.advertisement.localName,
      address: peripheral.address,
      uuid: peripheral.uuid
    };
  }

  shouldPush = (currentItems, itemToPush) => {
    if (!itemToPush.advertisement.localName) return false;
    if (currentItems.some((item) => item.uuid === itemToPush.uuid)) return false;
    return true;
  }

  setOnStateChangeHandler = () => {
    noble.on(ADAPTER_EVENTS.STATE_CHANGE, async (state) => {
      switch (state) {
        case STATES.POWERED_ON:
          this.isNobleReady = true;
      }
    });
  }

  setOnDiscoverHandler = () => {
    noble.on(ADAPTER_EVENTS.DISCOVER, async (peripheral) => {
      switch (this.state) {
        case managerStateEnum.CONNECTING:
          await this.handleConnecting(peripheral);
          break;
        case managerStateEnum.SCANNING:
          this.handleScanning(peripheral);
          break;
        default:
          break;
      }
    });
  }

  handleScanning = (peripheral) => {
    if (this.shouldPush(this.discoveredPeripherals, peripheral)) {
      this.discoveredPeripherals
        .push(this.createSimplePeripheral(peripheral));
    };
  }

  handleConnecting = async (peripheral) => {
    if (peripheral.address === this.deskAddress) {
      await noble.stopScanningAsync();

      this.desk = new Desk(peripheral);
      this.setOnConnectHandler(this.desk);
      this.desk.peripheral.connectAsync();

      this.state = managerStateEnum.IDLE;
    }
  }

  setOnConnectHandler = (desk) => {
    desk.peripheral.once(PERIPHERAL_EVENTS.CONNECT, async () => {
      const characteristics = await this.getCharacteristics(desk.peripheral);
      this.setCharacteristics(desk, characteristics);
    });
  }

  setCharacteristics = (desk, characteristics) => {
    desk.setCharacteristic('moveCharacteristic', this.getMoveCharacteristic(characteristics));
    desk.setCharacteristic('heightCharacteristic', this.getHeightCharacteristic(characteristics));
    desk.setCharacteristic('moveToCharacteristic', this.getMoveToCharacteristic(characteristics));
  }

  disconnect = async () => {
    if (this.desk) {
      await this.desk.disconnect();
    }
  }
};

export const deskManager = new DeskManager();
