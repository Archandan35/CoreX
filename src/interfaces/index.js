export class DatabaseInterface {
  async connect(_config) { throw new Error('Not implemented'); }
  async query(_sql, _params) { throw new Error('Not implemented'); }
  async transaction(_callback) { throw new Error('Not implemented'); }
  async disconnect() { throw new Error('Not implemented'); }
}

export class AuthInterface {
  async login(_credentials) { throw new Error('Not implemented'); }
  async register(_data) { throw new Error('Not implemented'); }
  async logout() { throw new Error('Not implemented'); }
  async refreshToken(_token) { throw new Error('Not implemented'); }
  async getUser() { throw new Error('Not implemented'); }
}

export class StorageInterface {
  async upload(_path, _file) { throw new Error('Not implemented'); }
  async download(_path) { throw new Error('Not implemented'); }
  async delete(_path) { throw new Error('Not implemented'); }
  async list(_path) { throw new Error('Not implemented'); }
  getUrl(_path) { throw new Error('Not implemented'); }
}

export class SearchInterface {
  async index(_entity, _data) { throw new Error('Not implemented'); }
  async search(_query, _options) { throw new Error('Not implemented'); }
  async deleteIndex(_entity) { throw new Error('Not implemented'); }
}

export class CacheInterface {
  async get(_key) { throw new Error('Not implemented'); }
  async set(_key, _value, _ttl) { throw new Error('Not implemented'); }
  async delete(_key) { throw new Error('Not implemented'); }
  async clear() { throw new Error('Not implemented'); }
}

export class QueueInterface {
  async enqueue(_queue, _job) { throw new Error('Not implemented'); }
  async dequeue(_queue) { throw new Error('Not implemented'); }
  async acknowledge(_queue, _jobId) { throw new Error('Not implemented'); }
}

export class NotificationInterface {
  async send(_recipient, _message) { throw new Error('Not implemented'); }
  async sendBulk(_recipients, _message) { throw new Error('Not implemented'); }
}

export class LoggingInterface {
  debug(_message, _meta) { throw new Error('Not implemented'); }
  info(_message, _meta) { throw new Error('Not implemented'); }
  warn(_message, _meta) { throw new Error('Not implemented'); }
  error(_message, _meta) { throw new Error('Not implemented'); }
  fatal(_message, _meta) { throw new Error('Not implemented'); }
}

export class AnalyticsInterface {
  async track(_event, _properties) { throw new Error('Not implemented'); }
  async identify(_userId, _traits) { throw new Error('Not implemented'); }
  async page(_name, _properties) { throw new Error('Not implemented'); }
}
