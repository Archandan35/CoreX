import BaseRepository from './BaseRepository.js';

export default class RoleRepository extends BaseRepository {
  constructor(db) {
    super({ table: 'roles', columns: ['id', 'name', 'label', 'description', 'permissions', 'created_at', 'updated_at'], primaryKey: 'id', rls: true, rlsPolicy: (user) => {
      if (user?.permissions?.includes('*')) return {};
      const canReadAll = user?.permissions?.includes('role:read');
      if (canReadAll) return {};
      return { filter: false };
    } }, db);
  }

  async findByName(name) {
    const result = await this.db.query(
      `SELECT ${this.columns.join(', ')} FROM ${this.table} WHERE name = $1`,
      [name]
    );
    return result[0] || null;
  }
}
