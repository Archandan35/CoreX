export class AuditService {
  constructor() {
    this.entries = [];
    this.maxEntries = 10000;
  }

  log(action, entity, entityId, user, changes = {}, metadata = {}) {
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      action,
      entity,
      entityId,
      userId: user?.id,
      userEmail: user?.email,
      changes,
      metadata,
      timestamp: new Date().toISOString(),
      ip: metadata.ip || null,
      userAgent: metadata.userAgent || null,
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }

    return entry;
  }

  getByEntity(entity, entityId) {
    return this.entries.filter((e) => e.entity === entity && e.entityId === entityId);
  }

  getByUser(userId) {
    return this.entries.filter((e) => e.userId === userId);
  }

  getByAction(action) {
    return this.entries.filter((e) => e.action === action);
  }

  getAll(options = {}) {
    let result = [...this.entries];
    if (options.limit) result = result.slice(-options.limit);
    return result.reverse();
  }

  clear() {
    this.entries = [];
  }
}

export const auditService = new AuditService();
