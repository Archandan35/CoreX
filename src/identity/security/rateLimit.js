const stores = new Map();

export class RateLimiter {
  constructor({ windowMs = 60000, max = 100, keyFn = (req) => req.ip || 'global' } = {}) {
    this.windowMs = windowMs;
    this.max = max;
    this.keyFn = keyFn;
  }

  check(key) {
    const now = Date.now();
    let entry = stores.get(key);

    if (!entry || now - entry.windowStart > this.windowMs) {
      entry = { windowStart: now, count: 0 };
      stores.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, this.max - entry.count);
    const reset = entry.windowStart + this.windowMs;

    return {
      allowed: entry.count <= this.max,
      remaining,
      reset,
      retryAfter: Math.ceil((reset - now) / 1000),
    };
  }
}

export function createRateLimiter(options) {
  return new RateLimiter(options);
}
