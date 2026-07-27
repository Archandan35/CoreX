export class AuditService {
  constructor(db) {
    this.db = db;
  }

  async record({ tableName, recordId, action, oldValues, newValues, changedBy, ipAddress }) {
    try {
      await this.db.query(
        `INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [tableName, recordId, action, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null, changedBy || null, ipAddress || null]
      );
    } catch {
    }
  }

  async findByEntity(tableName, recordId) {
    try {
      const result = await this.db.query(
        `SELECT * FROM audit_logs WHERE table_name = $1 AND record_id = $2 ORDER BY created_at DESC`,
        [tableName, recordId]
      );
      return result || [];
    } catch {
      return [];
    }
  }

  async findAll(limit = 100) {
    try {
      const result = await this.db.query(
        `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return result || [];
    } catch {
      return [];
    }
  }
}
