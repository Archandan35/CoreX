export class BackupEngine {
  constructor(dataProvider, storageProvider) {
    this.dataProvider = dataProvider;
    this.storageProvider = storageProvider;
  }

  async createBackup(options = {}) {
    const tables = options.tables || ['users', 'roles', 'settings'];
    const backup = {
      version: '1.0',
      format: 'udb',
      createdAt: new Date().toISOString(),
      tables: {},
    };

    for (const table of tables) {
      backup.tables[table] = await this.dataProvider.findAll(table);
    }

    if (options.storage) {
      const filename = `backup-${Date.now()}.udb`;
      await this.storageProvider.upload(options.storage.path || '/backups', filename, JSON.stringify(backup));
    }

    return backup;
  }

  async restoreBackup(backup, options = {}) {
    const tables = options.tables || Object.keys(backup.tables);

    for (const table of tables) {
      const records = backup.tables[table];
      if (!records) continue;

      for (const record of records) {
        try {
          await this.dataProvider.insert(table, record);
        } catch {
          // skip duplicates
        }
      }
    }

    return { restored: tables.length };
  }

  async listBackups(storagePath) {
    if (!this.storageProvider) return [];
    return this.storageProvider.list(storagePath || '/backups');
  }

  async getBackupInfo(storagePath, filename) {
    if (!this.storageProvider) return null;
    const data = await this.storageProvider.download(`${storagePath}/${filename}`);
    return JSON.parse(data);
  }
}
