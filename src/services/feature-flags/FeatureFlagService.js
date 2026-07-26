export class FeatureFlagService {
  constructor() {
    this.flags = new Map();
    this._overrides = new Map();
  }

  define(name, defaultValue = false) {
    this.flags.set(name, defaultValue);
  }

  isEnabled(name, user = null) {
    if (this._overrides.has(name)) return this._overrides.get(name);
    if (!this.flags.has(name)) return false;
    const value = this.flags.get(name);
    if (typeof value === 'function') return value(user);
    return value;
  }

  enable(name) { this._overrides.set(name, true); }
  disable(name) { this._overrides.set(name, false); }
  reset(name) { this._overrides.delete(name); }

  list() {
    const result = {};
    for (const [name, value] of this.flags) {
      result[name] = { default: value, current: this._overrides.has(name) ? this._overrides.get(name) : value };
    }
    return result;
  }

  load(config) {
    for (const [name, value] of Object.entries(config)) {
      this.flags.set(name, value);
    }
  }
}

export const featureFlagService = new FeatureFlagService();
