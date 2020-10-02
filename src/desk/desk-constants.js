import { UUIDWrapper } from '../shared/uuid-wrapper';

export const DESK_UUID = '3a48ee8fb68f4cb6833ec561dbf9bac4';

export const RAW_MAX_HEIGHT = 12700;
export const RAW_MIN_HEIGHT = 6200;
export const DESK_OFFSET = 6200;

export const CODES = {
  up: '4700',
  down: '4600',
  preflight: '0000',
  stop: 'FF00'
};

export const SERVICES = {
  move: new UUIDWrapper('99FA0001-338A-1024-8A49-009C0215F78A'),
  moveTo: new UUIDWrapper('99FA0030-338A-1024-8A49-009C0215F78A'),
  height: new UUIDWrapper('99FA0020-338A-1024-8A49-009C0215F78A')
};

export const CHARACTERISTICS = {
  move: new UUIDWrapper('99FA0002-338A-1024-8A49-009C0215F78A'),
  moveTo: new UUIDWrapper('99FA0031-338A-1024-8A49-009C0215F78A'),
  height: new UUIDWrapper('99FA0021-338A-1024-8A49-009C0215F78A')
};
