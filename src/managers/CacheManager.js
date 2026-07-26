import { cacheService } from '../services/cache/CacheService.js';

class CacheManager {
  constructor() {
    this._service = cacheService;
  }

  async get(key) { return this._service.get(key); }
  async set(key, value, ttl) { return this._service.set(key, value, ttl); }
  async delete(key) { return this._service.delete(key); }
  async clear() { return this._service.clear(); }
  async has(key) { return this._service.has(key); }
  async remember(key, ttl, factory) { return this._service.remember(key, ttl, factory); }
}

export const cacheManager = new CacheManager();
