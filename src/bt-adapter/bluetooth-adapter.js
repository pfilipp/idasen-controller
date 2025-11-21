import noble from '@abandonware/noble';
import { deskHelpers } from '../desk/desk-helpers.js';
import { ADAPTER_EVENTS, STATES } from '../shared/constants.js';

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

  getAdapterReadyAsync = async () => {
    return this.isAdapterReady;
  }

  scan = {
    start: async () => noble.startScanningAsync([], true),
    stop: async () => noble.stopScanningAsync()
  };

  getDeviceByAddress = async (deviceIdentifier) => {
    noble.removeAllListeners(ADAPTER_EVENTS.DISCOVER);

    // Create new promise for this search
    this.isDeskFound = this.createDeskFoundPromise();

    noble.on(ADAPTER_EVENTS.DISCOVER, this.createFindDeviceHandler(deviceIdentifier));
    await this.scan.start();

    // Add timeout to prevent infinite searching
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Device ${deviceIdentifier} not found after 10 seconds. Make sure the desk is powered on and try scanning again with: idasen scan --all`)), 10000)
    );

    const device = await Promise.race([this.isDeskFound, timeout]);
    await this.scan.stop();
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
      // Push the full peripheral object to preserve all properties including advertisement
      this.discoveredPeripherals.push(peripheral);
    };
  }

  createFindDeviceHandler = (deskIdentifier) => {
    return async (peripheral) => {
      // Match by address (Linux/Windows) or UUID (macOS)
      if (peripheral.address === deskIdentifier || peripheral.uuid === deskIdentifier || peripheral.id === deskIdentifier) {
        console.log(`Found matching device: ${peripheral.advertisement?.localName || 'Unknown'}`);
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

export { BluetoothAdapter };
export const bluetoothAdapter = new BluetoothAdapter();
