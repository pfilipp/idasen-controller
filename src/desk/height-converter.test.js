import { RAW_MAX_HEIGHT, DESK_OFFSET } from './desk-constants';
import { heightConverter } from './height-converter';

describe('HeightConverter', () => {
  it('should return absolute height', () => {
    // given
    const expectedValue = 1328;
    const relativeValue = 7528;
    // when
    const resultValue = heightConverter.getAbsoluteHeight(relativeValue);
    // then
    expect(resultValue).toEqual(expectedValue);
  });

  it('should return relative height', () => {
    // given
    const expectedValue = 7528;
    const absoluteValue = 1328;
    // when
    const resultValue = heightConverter.getRelativeHeight(absoluteValue);
    // then
    expect(resultValue).toEqual(expectedValue);
  });

  it('should convert dec to hex', () => {
    // given
    const givenValue = RAW_MAX_HEIGHT - DESK_OFFSET;
    const expectedValue = '1964';
    // when
    const resultValue = decimalToHexString(givenValue);
    // then
    expect(resultValue).toEqual(expectedValue);
  });

  it('should return hex representation of height', () => {
    // given
    const givenValue = 1328;
    const expectedValue = '3005';
    // when
    const resultValue = heightConverter.getHexRepresentation(givenValue);
    // then
    expect(resultValue).toEqual(expectedValue);
  });

  it('should return hex representation of height', () => {
    // given
    const givenValue = RAW_MAX_HEIGHT - DESK_OFFSET;
    const expectedValue = '6419';
    // when
    const resultValue = heightConverter.getHexRepresentation(givenValue);
    // then
    expect(resultValue).toEqual(expectedValue);
  });
});

const decimalToHexString = (number) => {
  let hexString = number.toString(16).toUpperCase();
  while(hexString.length <= 3){
    hexString = "0" + hexString;
  }
  return hexString;
}
