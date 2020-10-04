import { store } from '../store';
import { storeKeys } from '../store-keys';

export class HeightConverter {
  constructor (store) {
    this.store = store;
  }

  getAbsoluteHeight = (relativeHeight) => {
    const deskOffset = this.store.get(storeKeys.DESK_OFFSET_HEIGHT);
    return relativeHeight - deskOffset;
  }

  getRelativeHeight = (absoluteHeight) => {
    const deskOffset = this.store.get(storeKeys.DESK_OFFSET_HEIGHT);
    return absoluteHeight + deskOffset;
  }

  getHexRepresentation = (absoluteHeight) => {
    const hexString = decimalToHexString(absoluteHeight);
    const reversedBitHexString = reverseBitPairs(hexString);
    return reversedBitHexString;
  };

  getAbsoluteHeightFromBuffer = (heightInBytes) => {
    return heightInBytes.readInt16LE();
  }

  toCentimeters = (height) => {
    return height / 100;
  }

  toMilimeters = (height) => {
    return height * 100;
  }

  toHexReversed = (height) => {
    return heightConverter
      .getHexRepresentation(heightConverter
        .getAbsoluteHeight(heightConverter
          .toMilimeters(height)));
  }
};

const decimalToHexString = (number) => {
  let hexString = number.toString(16).toUpperCase();
  while (hexString.length <= 3) {
    hexString = '0' + hexString;
  }
  return hexString;
};

const reverseBitPairs = (hexString) => {
  return hexString.substring(2) + hexString.substring(0, 2);
};

export const heightConverter = new HeightConverter(store);
