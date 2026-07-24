import { describe, it, expect, beforeEach } from 'vitest';
import {
  SoftDeleteManager, softDelete,
  ArchiveManager, archiveManager,
  OfflineManager, offlineManager,
  SyncManager, syncManager,
  Repository, createRepository,
  DataLifecycle, dataLifecycle
} from '../shared/data-architecture';

describe('data-architecture', () => {
  describe('SoftDeleteManager', () => {
    let manager;
    beforeEach(() => { manager = new SoftDeleteManager(); });

    it('markDeleted and getDeleted items', () => {
      const deleted = manager.markDeleted('users', { id: 1, name: 'test' });
      expect(deleted.deletedAt).toBeDefined();
      expect(deleted._restoreId).toBeDefined();
      expect(manager.getDeleted('users')).toHaveLength(1);
    });

    it('restore recovers item', () => {
      manager.markDeleted('users', { id: 1, name: 'test' });
      const restored = manager.restore('users', 1);
      expect(restored).toBeTruthy();
      expect(manager.getDeleted('users')).toHaveLength(0);
    });
  });

  describe('ArchiveManager', () => {
    let am;
    beforeEach(() => { am = new ArchiveManager(); });

    it('archive and unarchive items', () => {
      const entry = am.archive('doc', [{ id: 1, title: 'doc1' }], 'test archive');
      expect(entry.resource).toBe('doc');
      const unarchived = am.unarchive(entry.id);
      expect(unarchived.resource).toBe('doc');
    });
  });

  describe('OfflineManager', () => {
    it('enqueue and getQueue', () => {
      const om = new OfflineManager();
      om.enqueue({ type: 'create', data: { id: 1 } });
      expect(om.getQueue()).toHaveLength(1);
    });

    it('clearQueue empties queue', () => {
      const om = new OfflineManager();
      om.enqueue({ type: 'delete', data: { id: 1 } });
      om.clearQueue();
      expect(om.getQueue()).toHaveLength(0);
    });
  });

  describe('SyncManager', () => {
    it('local-wins resolution', () => {
      const sm = new SyncManager();
      sm.defineStrategy('local-wins', (local) => local);
      const result = sm.resolve({ id: 1, name: 'local' }, { id: 1, name: 'remote' }, 'local-wins');
      expect(result.name).toBe('local');
    });

    it('remote-wins resolution', () => {
      const sm = new SyncManager();
      sm.defineStrategy('remote-wins', (local, remote) => remote);
      const result = sm.resolve({ id: 1, name: 'local' }, { id: 1, name: 'remote' }, 'remote-wins');
      expect(result.name).toBe('remote');
    });

    it('default timestamp-wins picks most recent', () => {
      const sm = new SyncManager();
      const recent = { id: 1, name: 'recent', updatedAt: '2025-01-01' };
      const old = { id: 1, name: 'old', updatedAt: '2020-01-01' };
      expect(sm.resolve(old, recent).name).toBe('recent');
      expect(sm.resolve(recent, old).name).toBe('recent');
    });
  });

  describe('Repository', () => {
    it('createRepository creates instance', () => {
      const repo = createRepository('test');
      expect(repo).toBeInstanceOf(Repository);
      expect(repo.resource).toBe('test');
    });

    it('throws without provider', () => {
      const repo = new Repository('items');
      expect(() => repo.provider).toThrow('not connected');
    });
  });

  describe('DataLifecycle', () => {
    it('defineRule and evaluate', async () => {
      const dl = new DataLifecycle();
      dl.defineRule('olderThan7days', (item) => {
        const age = Date.now() - new Date(item.createdAt).getTime();
        return age > 7 * 86400000;
      }, async (item) => item);

      const expired = { id: 1, createdAt: '1990-01-01' };
      const valid = { id: 2, createdAt: new Date().toISOString() };
      const results = await dl.evaluate([expired, valid]);
      expect(results).toHaveLength(1);
      expect(results[0].item).toBe(1);
    });
  });
});
