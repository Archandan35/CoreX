export class AuditService {
  constructor(db) {
    this.db = db;
  }

  async record({ action, entity, entityId, userId, changes, ipAddress }) {
    try {
      await this.db.query(
        `INSERT INTO audit_log (action, entity, entity_id, user_id, changes, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [action, entity, entityId, userId, changes ? JSON.stringify(changes) : null, ipAddress || null]
      );
    } catch {
    }
  }

  async findByEntity(entity, entityId) {
    try {
      return await this.db.query(
        `SELECT * FROM audit_log WHERE entity = $1 AND entity_id = $2 ORDER BY created_at DESC`,
        [entity, entityId]
      );
    } catch {
      return [];
    }
  }

  async findAll(limit = 100) {
    try {
      return await this.db.query(
        `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
    } catch {
      return [];
    }
  }
}
