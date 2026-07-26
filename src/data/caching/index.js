export class CacheService {
  constructor(options = {}) {
    this.store = new Map();
    this.ttl = options.ttl || 300000;
    this.maxSize = options.maxSize || 500;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttl) {
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.entries().next();
      if (oldest.value) this.store.delete(oldest.value[0]);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttl || this.ttl),
    });
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  wrap(key, fetchFn, ttl) {
    const cached = this.get(key);
    if (cached !== undefined) return Promise.resolve(cached);
    return fetchFn().then((result) => {
      this.set(key, result, ttl);
      return result;
    });
  }
}

export const cache = new CacheService();
