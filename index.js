import { bluetoothAdapter } from './src/bt-adapter/bluetooth-adapter';
import { DeskManager } from './src/desk-manager';

export const deskManager = new DeskManager(bluetoothAdapter);
