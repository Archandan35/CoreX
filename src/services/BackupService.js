import PROVIDER from '../data-provider';

class BackupService {
  async createBackup(include = ['users', 'roles', 'settings']) {
    const backup = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      version: '1.0',
      format: 'ueaf',
      data: {}
    };
    for (const resource of include) {
      const result = await PROVIDER.findMany(resource, { pageSize: 10000 });
      backup.data[resource] = result.data;
    }
    return backup;
  }

  async restoreBackup(backup) {
    const results = [];
    for (const [resource, items] of Object.entries(backup.data)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          try {
            const existing = await PROVIDER.findMany(resource, { filters: { id: item.id }, pageSize: 1 });
            if (existing.data.length > 0) {
              await PROVIDER.update(resource, item.id, item);
            } else {
              await PROVIDER.create(resource, item);
            }
            results.push({ resource, id: item.id, status: 'restored' });
          } catch (e) {
            results.push({ resource, id: item.id, status: 'failed', error: e.message });
          }
        }
      }
    }
    return { success: true, results };
  }

  downloadBackup(backup) {
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${backup.id}.uef.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

const backupService = new BackupService();
export default backupService;
