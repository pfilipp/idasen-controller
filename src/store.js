class Store {
  constructor () {
    this._store = {};
  }

  clear = () => {
    this._store = {};
  }

  add = (key, value) => {
    if (this.exists(key)) {
      throw new Error('Key already exists. Use .addWithOverwrite() to overwrite value.');
    }
    this.addWithOverwrite(key, value);
  };

  addWithOverwrite = (key, value) => {
    this._store[key] = value;
  };

  get = (key) => {
    return this._store[key];
  };

  exists = (key) => {
    return !!this._store[key];
  };

  existsWithValue = (key, value) => {
    return !!this._store[key] && this.get(key) === value;
  };
};

export const store = new Store();
