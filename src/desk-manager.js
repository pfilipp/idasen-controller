import noble from '@abandonware/noble';
import { STATES, ADAPTER_EVENTS } from './noble-constants';
import { Desk } from './desk';
import { deskHelpers } from './helpers';

const managerStateEnum = {
  SCANNING: 'scanning',
  CONNECTING: 'connecting',
  IDLE: 'idle'
};

const SCANNING_TIME_DURATION = 4000;

class DeskManager {
  constructor () {
    this.desk = null;
    this.deskAddress = null;
    this.discoveredPeripherals = [];
    this.state = managerStateEnum.IDLE;

    this.setOnStateChangeHandler();
    this.setOnDiscoverHandler();

    this.isNobleReady = this.createNoblePromise();
    this.isDeskReady = this.createDeskPromise();
  }

  createNoblePromise = () => new Promise((resolve, reject) => {
    this.nobleReadyPromiseResolve = resolve;
  });

  createDeskPromise = () => new Promise((resolve, reject) => {
    this.deskReadyPromiseResolve = resolve;
  });

  scanAsync = async () => {
    await this.isNobleReady;
    this.state = managerStateEnum.SCANNING;
    try {
      noble.startScanningAsync([], true);
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          noble.stopScanningAsync();
          this.state = managerStateEnum.IDLE;
          resolve(this.discoveredPeripherals);
        }, SCANNING_TIME_DURATION);
      });
    } catch (error) {
      return ({ message: 'Unable to scan.' });
    }
  }

  connectAsync = async (address) => {
    this.deskAddress = address;
    this.state = managerStateEnum.CONNECTING;
    await noble.startScanningAsync([], true);
    await this.isDeskReady;
    const result = this.desk
      ? 'success'
      : 'failure';

    this.state = managerStateEnum.IDLE;
    return result;
  }

  disconnectAsync = async () => {
    if (this.desk) {
      await this.desk.disconnectAsync();
    }
    this.deskAddress = null;
    this.desk = null;
    return 'success';
  }

  getCharacteristicsAsync = async (desk) => {
    const { characteristics } = await desk.discoverAllServicesAndCharacteristicsAsync();
    return characteristics;
  }

  setOnStateChangeHandler = () => {
    noble.on(ADAPTER_EVENTS.STATE_CHANGE, async (state) => {
      switch (state) {
        case STATES.POWERED_ON:
          this.nobleReadyPromiseResolve();
      }
    });
  }

  setOnDiscoverHandler = () => {
    noble.on(ADAPTER_EVENTS.DISCOVER, async (peripheral) => {
      switch (this.state) {
        case managerStateEnum.CONNECTING:
          this.handleConnecting(peripheral);
          break;
        case managerStateEnum.SCANNING:
          this.handleScanning(peripheral);
          break;
        default:
          break;
      }
    });
  }

  setOnDisconnectHandler = () => {
    this.desk.peripheral.once('disconnect', () => {
      console.log('disconnected');
      this.desk = null;
      this.discoveredPeripherals = [];
      this.isDeskReady = this.createDeskPromise();
      this.state = managerStateEnum.CONNECTING;
      noble.startScanningAsync([], true);
    });
  }

  handleScanning = (peripheral) => {
    if (deskHelpers.shouldPush(this.discoveredPeripherals, peripheral)) {
      this.discoveredPeripherals
        .push(deskHelpers.createSimplePeripheral(peripheral));
    };
  }

  handleConnecting = async (peripheral) => {
    if (peripheral.address === this.deskAddress) {
      noble.stopScanningAsync();

      this.desk = new Desk(peripheral);
      await this.desk.peripheral.connectAsync();

      const characteristics = await this.getCharacteristicsAsync(this.desk.peripheral);
      this.setCharacteristics(this.desk, characteristics);
      this.deskReadyPromiseResolve();
      this.setOnDisconnectHandler();

      this.state = managerStateEnum.IDLE;
    }
  }

  setCharacteristics = (desk, characteristics) => {
    console.log('settings characteristics');
    desk.setCharacteristic('moveCharacteristic', deskHelpers.getMoveCharacteristic(characteristics));
    desk.setCharacteristic('heightCharacteristic', deskHelpers.getHeightCharacteristic(characteristics));
    desk.setCharacteristic('moveToCharacteristic', deskHelpers.getMoveToCharacteristic(characteristics));
  }
};

export const deskManager = new DeskManager();
