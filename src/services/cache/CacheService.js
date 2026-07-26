export class CacheService {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
  }

  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.ttls.has(key) && Date.now() > this.ttls.get(key)) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return entry;
  }

  async set(key, value, ttlMs = 300000) {
    this.store.set(key, value);
    if (ttlMs > 0) {
      this.ttls.set(key, Date.now() + ttlMs);
    }
  }

  async delete(key) {
    this.store.delete(key);
    this.ttls.delete(key);
  }

  async clear() {
    this.store.clear();
    this.ttls.clear();
  }

  async has(key) {
    const val = await this.get(key);
    return val !== null;
  }

  async remember(key, ttlMs, factory) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    const value = await factory();
    await this.set(key, value, ttlMs);
    return value;
  }
}

export const cacheService = new CacheService();
