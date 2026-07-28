import { getDatabase } from '../data/index.js';

export class AuditService {
  async logChange({ setting, oldValue, newValue, userId }) {
    try {
      const db = getDatabase();
      await db.query(
        `INSERT INTO audit_logs (setting, old_value, new_value, changed_by, changed_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [setting, JSON.stringify(oldValue), JSON.stringify(newValue), userId]
      );
    } catch {}
  }
}

export const auditService = new AuditService();
