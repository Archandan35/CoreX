import { useState, useCallback, useRef, useEffect } from 'react';

class QueryCache {
  constructor() { this._cache = new Map(); this._subscribers = new Map(); }
  get(key) { return this._cache.get(key); }
  set(key, data) {
    this._cache.set(key, { data, timestamp: Date.now() });
    this._notify(key, data);
  }
  has(key) { return this._cache.has(key); }
  delete(key) { this._cache.delete(key); }
  clear() { this._cache.clear(); }
  isStale(key, ttlMs = 30000) {
    const entry = this._cache.get(key);
    return !entry || (Date.now() - entry.timestamp) > ttlMs;
  }
  subscribe(key, callback) {
    if (!this._subscribers.has(key)) this._subscribers.set(key, new Set());
    this._subscribers.get(key).add(callback);
    return () => this._subscribers.get(key)?.delete(callback);
  }
  _notify(key, data) {
    this._subscribers.get(key)?.forEach(cb => cb(data));
  }
}

const globalQueryCache = new QueryCache();

export function useQueryCache(key, fetcher, options = {}) {
  const { ttl = 30000, enabled = true } = options;
  const [data, setData] = useState(() => globalQueryCache.get(key)?.data || null);
  const [loading, setLoading] = useState(!globalQueryCache.has(key));
  const [error, setError] = useState(null);
  const keyRef = useRef(key);

  useEffect(() => {
    keyRef.current = key;
    const unsub = globalQueryCache.subscribe(key, (newData) => {
      if (keyRef.current === key) setData(newData);
    });
    return unsub;
  }, [key]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      globalQueryCache.set(key, result);
      setData(result);
      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [key, fetcher]);

  useEffect(() => {
    if (enabled && globalQueryCache.isStale(key, ttl)) {
      refetch();
    }
  }, [key, enabled, ttl, refetch]);

  const invalidate = useCallback(() => {
    globalQueryCache.delete(key);
  }, [key]);

  return { data, loading, error, refetch, invalidate };
}
