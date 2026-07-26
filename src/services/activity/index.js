export class ActivityService {
  constructor(db) {
    this.db = db;
  }

  async log({ action, resource, resourceId, userId, metadata }) {
    try {
      await this.db.query(
        `INSERT INTO activity_log (action, resource, resource_id, user_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [action, resource, resourceId, userId, metadata ? JSON.stringify(metadata) : null]
      );
    } catch {
    }
  }

  async findByUser(userId, limit = 50) {
    try {
      return await this.db.query(
        `SELECT * FROM activity_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [userId, limit]
      );
    } catch {
      return [];
    }
  }

  async findAll(limit = 100) {
    try {
      return await this.db.query(
        `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
    } catch {
      return [];
    }
  }
}
