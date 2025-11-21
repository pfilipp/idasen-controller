import { store } from './store.js';
import { bluetoothAdapter } from './bt-adapter/bluetooth-adapter.js';
import { DeskManager } from './desk/desk-manager.js';
import { storeKeys } from './store-keys.js';

const setDefaultValues = () => {
  store.add(storeKeys.DEFAULT_HEIGHT_TOLERANCE_THRESHOLD, 0.005);
  store.add(storeKeys.DESK_OFFSET_HEIGHT, 6200);
  store.add(storeKeys.MOVE_TIME_DURATION, 500);
  store.add(storeKeys.PREFLIGHT_TIME_DURATION, 200);
  store.add(storeKeys.RAW_MAX_HEIGHT, 12700);
  store.add(storeKeys.RAW_MIN_HEIGHT, 6200);
};

setDefaultValues();

export const deskManager = new DeskManager(bluetoothAdapter);
export const deskSettings = {
  store, storeKeys
};
