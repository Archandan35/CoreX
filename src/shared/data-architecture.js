import { storage } from '../utils/storage';
import { generateId } from '../utils/id';

export class SoftDeleteManager {
  constructor() { this._deletedItems = new Map(); }

  markDeleted(resource, item) {
    const key = `${resource}:${item.id}`;
    const deleted = { ...item, deletedAt: new Date().toISOString(), _restoreId: generateId() };
    this._deletedItems.set(key, deleted);
    return deleted;
  }

  restore(resource, id) {
    const key = `${resource}:${id}`;
    const item = this._deletedItems.get(key);
    if (item) {
      this._deletedItems.delete(key);
      return item;
    }
    return null;
  }

  getDeleted(resource) {
    const key = `soft_delete_${resource}:`;
    const items = [];
    this._deletedItems.forEach((item, k) => {
      if (k.startsWith(key)) items.push(item);
    });
    return items;
  }

  purgeOlderThan(days = 30) {
    const cutoff = Date.now() - days * 86400000;
    this._deletedItems.forEach((item, k) => {
      if (k.startsWith('soft_delete_') && new Date(item.deletedAt).getTime() < cutoff) {
        this._deletedItems.delete(k);
      }
    });
  }
}

export const softDelete = new SoftDeleteManager();

export class ArchiveManager {
  constructor() { this._archives = new Map(); }

  archive(resource, items, reason = '') {
    const archiveId = generateId();
    const entry = {
      id: archiveId, resource, items, reason,
      archivedAt: new Date().toISOString(), size: items.length,
    };
    this._archives.set(archiveId, entry);
    return entry;
  }

  unarchive(archiveId) {
    const entry = this._archives.get(archiveId);
    if (entry) return entry;
    return null;
  }

  listArchives(resource) {
    const archives = [];
    this._archives.forEach((entry) => {
      if (!resource || entry.resource === resource) archives.push(entry);
    });
    return archives.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
  }
}

export const archiveManager = new ArchiveManager();

export class OfflineManager {
  constructor() {
    this._queue = [];
    this._isOnline = navigator.onLine;
    window.addEventListener('online', () => { this._isOnline = true; this._processQueue(); });
    window.addEventListener('offline', () => { this._isOnline = false; });
    this._loadQueue();
  }

  isOnline() { return this._isOnline; }

  enqueue(operation) {
    const entry = { id: generateId(), ...operation, queuedAt: new Date().toISOString(), retries: 0 };
    this._queue.push(entry);
    this._saveQueue();
    return entry;
  }

  async _processQueue() {
    if (!this._isOnline || !this._queue.length) return;
    const pending = [...this._queue];
    this._queue = [];
    for (const op of pending) {
      try {
        await this._execute(op);
      } catch {
        op.retries++;
        if (op.retries < 5) this._queue.push(op);
      }
    }
    this._saveQueue();
  }

  async _execute(op) {
    const PROVIDER = (await import('../data-provider')).default;
    if (op.type === 'create') return PROVIDER.create(op.resource, op.data);
    if (op.type === 'update') return PROVIDER.update(op.resource, op.id, op.data);
    if (op.type === 'delete') return PROVIDER.delete(op.resource, op.id);
  }

  _saveQueue() { storage.set('offline_queue', this._queue); }
  _loadQueue() { this._queue = storage.get('offline_queue') || []; }
  getQueue() { return [...this._queue]; }
  clearQueue() { this._queue = []; this._saveQueue(); }
}

export const offlineManager = new OfflineManager();

export class SyncManager {
  constructor() {
    this._conflicts = [];
    this._strategies = {
      'local-wins': (local, remote) => local,
      'remote-wins': (local, remote) => remote,
      'merge': (local, remote) => ({ ...remote, ...local, mergedAt: new Date().toISOString() }),
      'timestamp-wins': (local, remote) => {
        const lTime = new Date(local.updatedAt || 0).getTime();
        const rTime = new Date(remote.updatedAt || 0).getTime();
        return lTime > rTime ? local : remote;
      },
    };
  }

  defineStrategy(name, fn) { this._strategies[name] = fn; }

  resolve(local, remote, strategy = 'timestamp-wins') {
    const resolver = this._strategies[strategy];
    if (!resolver) throw new Error(`Unknown sync strategy: ${strategy}`);
    const resolved = resolver(local, remote);
    if (JSON.stringify(local) !== JSON.stringify(remote) && strategy === 'merge') {
      this._conflicts.push({ local, remote, resolved, resolvedAt: new Date().toISOString() });
    }
    return resolved;
  }

  getConflicts() { return [...this._conflicts]; }
  clearConflicts() { this._conflicts = []; }
}

export const syncManager = new SyncManager();

export class Repository {
  constructor(resource, provider = null) {
    this.resource = resource;
    this._provider = provider;
  }

  get provider() {
    if (this._provider) return this._provider;
    throw new Error('Repository not connected to a provider');
  }

  connect(provider) { this._provider = provider; }

  async findAll(query = {}) { return this.provider.findMany(this.resource, query); }
  async findById(id) { return this.provider.findById(this.resource, id); }
  async create(data) {
    const item = await this.provider.create(this.resource, data);
    return item;
  }
  async update(id, data) { return this.provider.update(this.resource, id, data); }
  async delete(id) { return this.provider.delete(this.resource, id); }
  async softDelete(id) {
    const item = await this.findById(id);
    if (item) {
      softDelete.markDeleted(this.resource, item);
      return this.provider.delete(this.resource, id);
    }
    return null;
  }
  async search(query, options) { return this.provider.search(this.resource, query, options); }
  async count(query = {}) {
    const result = await this.findAll({ ...query, pageSize: 1 });
    return result.total;
  }
  async exists(id) {
    try { await this.findById(id); return true; }
    catch { return false; }
  }
}

export function createRepository(resource) {
  return new Repository(resource);
}

export class DataLifecycle {
  constructor() {
    this._rules = [];
  }

  defineRule(name, checkFn, actionFn) {
    this._rules.push({ name, checkFn, actionFn });
  }

  async evaluate(items) {
    const results = [];
    for (const item of items) {
      for (const rule of this._rules) {
        if (rule.checkFn(item)) {
          await rule.actionFn(item);
          results.push({ item: item.id, rule: rule.name });
        }
      }
    }
    return results;
  }

  defineRetention(days, actionFn) {
    this.defineRule('retention', (item) => {
      const age = Date.now() - new Date(item.createdAt || 0).getTime();
      return age > days * 86400000;
    }, actionFn);
  }
}

export const dataLifecycle = new DataLifecycle();
