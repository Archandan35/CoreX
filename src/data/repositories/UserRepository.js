import BaseRepository from './BaseRepository.js';

export default class UserRepository extends BaseRepository {
  constructor(db) {
    super({ table: 'users', columns: ['id', 'name', 'username', 'email', 'phone', 'password_hash', 'role_label', 'full_access', 'permissions', 'status', 'created_at', 'updated_at'], primaryKey: 'id', rls: true, rlsPolicy: (user) => {
      if (user?.permissions?.includes('*')) return {};
      const canReadAll = user?.permissions?.includes('user:read');
      if (canReadAll) return {};
      return { filter: { id: user?.id } };
    } }, db);
  }

  async findByEmail(email) {
    const result = await this.db.query(
      `SELECT ${this.columns.join(', ')} FROM ${this.table} WHERE email = $1`,
      [email]
    );
    return result[0] || null;
  }
}
