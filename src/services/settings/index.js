export class SettingsService {
  constructor(db) {
    this.db = db;
    this.cache = {};
  }

  async get(key) {
    if (this.cache[key] !== undefined) return this.cache[key];
    try {
      const result = await this.db.query(
        `SELECT value FROM settings WHERE key = $1`, [key]
      );
      this.cache[key] = result[0]?.value || null;
      return this.cache[key];
    } catch {
      return null;
    }
  }

  async getAll() {
    try {
      const result = await this.db.query(`SELECT key, value FROM settings`);
      const settings = {};
      for (const row of result) {
        settings[row.key] = row.value;
        this.cache[row.key] = row.value;
      }
      return settings;
    } catch {
      return {};
    }
  }

  async set(key, value) {
    try {
      await this.db.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value]
      );
      this.cache[key] = value;
    } catch {
    }
  }

  async update(updates) {
    for (const [key, value] of Object.entries(updates)) {
      await this.set(key, value);
    }
  }

  clearCache() {
    this.cache = {};
  }
}
