import { SettingsEngine } from '../business/settings/SettingsEngine.js';

class SettingsManager {
  constructor() {
    this.engine = null;
    this.listeners = new Map();
  }

  init(settingsRepository) {
    this.engine = new SettingsEngine(settingsRepository);
  }

  async get(key) {
    return this.engine?.get(key);
  }

  async set(key, value, user) {
    await this.engine?.set(key, value, user);
    const listeners = this.listeners.get(key) || [];
    listeners.forEach((fn) => fn(value));
  }

  async getAll() {
    return this.engine?.getAll() || {};
  }

  onChange(key, fn) {
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key).push(fn);
    return () => {
      const list = this.listeners.get(key);
      if (list) this.listeners.set(key, list.filter((l) => l !== fn));
    };
  }

  notifyChange(values) {
    Object.entries(values || {}).forEach(([key, value]) => {
      this.listeners.get(key)?.forEach((fn) => fn(value));
    });
  }
}

export const settingsManager = new SettingsManager();
