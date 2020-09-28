import { bluetoothAdapter } from './bt-adapter/bluetooth-adapter';
import { DeskManager } from './desk/desk-manager';

export const deskManager = new DeskManager(bluetoothAdapter);
