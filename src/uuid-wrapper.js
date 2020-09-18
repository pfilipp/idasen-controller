export class UUIDWrapper {
  constructor(uuid){
    this._uuid = uuid;
  }

  get uuid(){
    return this._uuid;
  }

  get  uuidNoDashes(){
    return this.uuid.replace(/-/g, '');
  }

  get uuidNoDashesLowCase(){
    return this.uuidNoDashes.toLowerCase();
  }
}
