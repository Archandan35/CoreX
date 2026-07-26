export class DatabaseInterface {
  async connect(config) { throw new Error('Not implemented'); }
  async query(sql, params) { throw new Error('Not implemented'); }
  async transaction(callback) { throw new Error('Not implemented'); }
  async disconnect() { throw new Error('Not implemented'); }
}

export class AuthInterface {
  async login(credentials) { throw new Error('Not implemented'); }
  async register(data) { throw new Error('Not implemented'); }
  async logout() { throw new Error('Not implemented'); }
  async refreshToken(token) { throw new Error('Not implemented'); }
  async getUser() { throw new Error('Not implemented'); }
}

export class StorageInterface {
  async upload(path, file) { throw new Error('Not implemented'); }
  async download(path) { throw new Error('Not implemented'); }
  async delete(path) { throw new Error('Not implemented'); }
  async list(path) { throw new Error('Not implemented'); }
  getUrl(path) { throw new Error('Not implemented'); }
}

export class SearchInterface {
  async index(entity, data) { throw new Error('Not implemented'); }
  async search(query, options) { throw new Error('Not implemented'); }
  async deleteIndex(entity) { throw new Error('Not implemented'); }
}

export class CacheInterface {
  async get(key) { throw new Error('Not implemented'); }
  async set(key, value, ttl) { throw new Error('Not implemented'); }
  async delete(key) { throw new Error('Not implemented'); }
  async clear() { throw new Error('Not implemented'); }
}

export class QueueInterface {
  async enqueue(queue, job) { throw new Error('Not implemented'); }
  async dequeue(queue) { throw new Error('Not implemented'); }
  async acknowledge(queue, jobId) { throw new Error('Not implemented'); }
}

export class NotificationInterface {
  async send(recipient, message) { throw new Error('Not implemented'); }
  async sendBulk(recipients, message) { throw new Error('Not implemented'); }
}

export class LoggingInterface {
  debug(message, meta) { throw new Error('Not implemented'); }
  info(message, meta) { throw new Error('Not implemented'); }
  warn(message, meta) { throw new Error('Not implemented'); }
  error(message, meta) { throw new Error('Not implemented'); }
  fatal(message, meta) { throw new Error('Not implemented'); }
}

export class AnalyticsInterface {
  async track(event, properties) { throw new Error('Not implemented'); }
  async identify(userId, traits) { throw new Error('Not implemented'); }
  async page(name, properties) { throw new Error('Not implemented'); }
}
