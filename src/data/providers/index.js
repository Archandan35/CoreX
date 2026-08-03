export class DatabaseProvider {
  constructor() {
    this.connection = null;
    this.type = null;
  }

  async connect(_config) {
    throw new Error('connect() must be implemented by provider subclass.');
  }

  async query(_sql, _params) {
    throw new Error('query() must be implemented by provider subclass.');
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented by provider subclass.');
  }
}
