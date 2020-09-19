import { DESK_OFFSET } from './desk-constants';

export class HeightConverter {
  getAbsoluteHeight = (relativeHeight) => {
    return relativeHeight - DESK_OFFSET;
  }

  getRelativeHeight = (absoluteHeight) => {
    return absoluteHeight + DESK_OFFSET;
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

export const heightConverter = new HeightConverter();
