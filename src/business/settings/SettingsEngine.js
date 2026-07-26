export class SettingsEngine {
  constructor(repository) {
    this.repository = repository;
    this.cache = new Map();
  }

  async get(key) {
    if (this.cache.has(key)) return this.cache.get(key);
    const record = await this.repository.findByKey(key);
    const value = record ? record.value : null;
    this.cache.set(key, value);
    return value;
  }

  async set(key, value, user) {
    const existing = await this.repository.findByKey(key);
    if (existing) {
      await this.repository.update(existing.id, { key, value }, user);
    } else {
      await this.repository.create({ key, value }, user);
    }
    this.cache.set(key, value);
  }

  async getAll() {
    const records = await this.repository.findAll();
    const settings = {};
    for (const r of records) {
      settings[r.key] = r.value;
      this.cache.set(r.key, r.value);
    }
    return settings;
  }

  async delete(key, user) {
    const record = await this.repository.findByKey(key);
    if (record) {
      await this.repository.delete(record.id, user);
      this.cache.delete(key);
    }
  }

  clearCache() {
    this.cache.clear();
  }
}
