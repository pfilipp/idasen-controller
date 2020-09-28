
class BluetoothAdapter{
  constructor(){
    this.adapterReadyPromiseResolve = null;
    this.isAdapterReady = this.createAdapterPromise();
    this.setOnStateChangeHandler();
  }

  createAdapterPromise = () => new Promise((resolve, reject) => {
    this.adapterReadyPromiseResolve = resolve;
  });

  scan = {
    start: () => await noble.startScanningAsync([], true),
    stop: () => noble.stopScanningAsync(),
  };

  setOnStateChangeHandler = () => {
    noble.on(ADAPTER_EVENTS.STATE_CHANGE, async (state) => {
      switch (state) {
        case STATES.POWERED_ON:
          this.nobleReadyPromiseResolve();
      }
    });
  }
};

export const bluetoothAdapter = new BluetoothAdapter();
