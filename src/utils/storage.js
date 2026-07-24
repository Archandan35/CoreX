const mem = new Map();

export const storage = {
  get(key) {
    return mem.get(key) ?? null;
  },
  set(key, value) {
    try { mem.set(key, value); return true; }
    catch { return false; }
  },
  remove(key) {
    try { mem.delete(key); return true; }
    catch { return false; }
  },
  clear() {
    try { mem.clear(); return true; }
    catch { return false; }
  }
};

export const session = {
  get(key) {
    try {
      const val = sessionStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },
  set(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) {
    try { sessionStorage.removeItem(key); return true; }
    catch { return false; }
  }
};
