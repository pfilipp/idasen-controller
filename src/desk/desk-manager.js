import { Desk } from './desk';
import { DeskController } from './desk-controller';

export class DeskManager {
  constructor (bluetoothAdapter) {
    this.desk = null;
    this.deskController = null;
    this.deskAddress = null;
    this.discoveredPeripherals = [];
    this.bluetoothAdapter = bluetoothAdapter;

    this.isDeskReady = this.createDeskPromise();
  }

  createDeskPromise = () => new Promise((resolve, reject) => {
    this.deskReadyPromiseResolve = resolve;
  });

  getAvailableDevices = async () => {
    return await this.bluetoothAdapter.getAvailableDevices();
  }

  connectAsync = async (address) => {
    this.deskAddress = address;

    const peripheral = await this.bluetoothAdapter.getDeviceByAddress(address);
    this.desk = new Desk(peripheral);

    await this.desk.connect();
    await this.desk.init();

    this.deskController = new DeskController(this.desk);

    this.deskReadyPromiseResolve();
    this.setOnDisconnectHandler();

    const result = this.desk
      ? 'success'
      : 'failure';

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

  setOnDisconnectHandler = () => {
    this.desk.peripheral.once('disconnect', () => {
      console.log('disconnected');
      this.desk = null;
      this.deskController = null;
      this.discoveredPeripherals = [];
      this.isDeskReady = this.createDeskPromise();

      this.connectAsync(this.deskAddress);
    });
  }
};
