import { cacheManager } from '../../managers/CacheManager.js';

const INVALIDATION_EVENTS = new Set();

const listeners = new Map();

export function onInvalidate(key, fn) {
  if (!listeners.has(key)) listeners.set(key, []);
  listeners.get(key).push(fn);
  return () => {
    const list = listeners.get(key);
    if (list) listeners.set(key, list.filter(l => l !== fn));
  };
}

export async function invalidateCache(keys) {
  const keysArr = Array.isArray(keys) ? keys : [keys];
  for (const key of keysArr) {
    INVALIDATION_EVENTS.add(key);
    await cacheManager.delete(key);
  }
  for (const key of keysArr) {
    listeners.get(key)?.forEach(fn => fn());
  }
}

export async function clearAllCaches() {
  await cacheManager.clear();
  INVALIDATION_EVENTS.clear();
  listeners.forEach((list) => list.forEach(fn => fn()));
}
