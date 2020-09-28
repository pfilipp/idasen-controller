import noble from '@abandonware/noble';
import { deskHelpers } from '../helpers';
import { ADAPTER_EVENTS, STATES } from './constants';

const SCANNING_TIME_DURATION = 4000;

class BluetoothAdapter {
  constructor () {
    this.discoveredPeripherals = [];
    this.adapterReadyPromiseResolve = null;
    this.deskFoundPromiseResolve = null;

    this.isAdapterReady = this.createAdapterPromise();
    this.isDeskFound = this.createDeskFoundPromise();

    this.setOnStateChangeHandler();
  }

  createAdapterPromise = () => new Promise((resolve, reject) => {
    this.adapterReadyPromiseResolve = resolve;
  });

  createDeskFoundPromise = () => new Promise((resolve, reject) => {
    this.deskFoundPromiseResolve = resolve;
  });

  scan = {
    start: async () => noble.startScanningAsync([], true),
    stop: async () => noble.stopScanningAsync()
  };

  getDeviceByAddress = async (deviceAddress) => {
    noble.removeAllListeners(ADAPTER_EVENTS.DISCOVER);
    noble.on(ADAPTER_EVENTS.DISCOVER, this.createFindDeviceHandler(deviceAddress));
    this.scan.start();
    const device = await this.isDeskFound;
    return device;
  }

  getAvailableDevices = async () => {
    noble.removeAllListeners(ADAPTER_EVENTS.DISCOVER);
    noble.on(ADAPTER_EVENTS.DISCOVER, this.handleScanning);
    await this.isAdapterReady;
    try {
      await this.scan.start();
      return new Promise((resolve) => {
        setTimeout(() => {
          this.scan.stop();
          resolve(this.discoveredPeripherals);
        }, SCANNING_TIME_DURATION);
      });
    } catch (error) {
      // TODO: change to reject?
      return ({ message: 'Unable to scan.' });
    }
  }

  handleScanning = (peripheral) => {
    if (deskHelpers.shouldPush(this.discoveredPeripherals, peripheral)) {
      this.discoveredPeripherals
        .push(deskHelpers.createSimplePeripheral(peripheral));
    };
  }

  createFindDeviceHandler = (deskAddress) => {
    return async (peripheral) => {
      if (peripheral.address === deskAddress) {
        this.scan.stop();
        this.deskFoundPromiseResolve(peripheral);
      }
    };
  }

  setOnStateChangeHandler = () => {
    noble.on(ADAPTER_EVENTS.STATE_CHANGE, async (state) => {
      switch (state) {
        case STATES.POWERED_ON:
          this.adapterReadyPromiseResolve();
      }
    });
  }
};

export const bluetoothAdapter = new BluetoothAdapter();
