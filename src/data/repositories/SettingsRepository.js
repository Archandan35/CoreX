import BaseRepository from './BaseRepository.js';

export default class SettingsRepository extends BaseRepository {
  constructor(db) {
    super({ table: 'settings', columns: ['key', 'value', 'updated_at'], primaryKey: 'key', rls: true, rlsPolicy: (user) => {
      if (user?.permissions?.includes('settings:read') || user?.permissions?.includes('*')) return {};
      return { filter: false };
    } }, db);
  }

  async getAll() {
    const result = await this.db.query(`SELECT key, value FROM settings`);
    const settings = {};
    for (const row of result) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  async update(updates) {
    for (const [key, value] of Object.entries(updates)) {
      await this.db.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value]
      );
    }
  }
}
