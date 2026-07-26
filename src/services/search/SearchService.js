export class SearchService {
  constructor(provider) {
    this.provider = provider;
  }

  async search(query, options = {}) {
    return this.provider.search(query, options);
  }

  async index(entity, data) {
    return this.provider.index(entity, data);
  }

  async reindex(entity, items) {
    return this.provider.reindex(entity, items);
  }

  async deleteIndex(entity) {
    return this.provider.deleteIndex(entity);
  }
}

export class PostgresSearchProvider {
  constructor(db) {
    this.db = db;
  }

  async search(query, options = {}) {
    const { fields = [], limit = 20, offset = 0 } = options;
    if (fields.length === 0) return { data: [], total: 0 };

    const conditions = fields.map((f, i) => `${f} ILIKE $${i + 1}`);
    const params = fields.map(() => `%${query}%`);
    const sql = `SELECT * FROM ${options.table || 'users'} WHERE ${conditions.join(' OR ')} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const data = await this.db.query(sql, params);
    const countResult = await this.db.query(
      `SELECT COUNT(*) as total FROM ${options.table || 'users'} WHERE ${conditions.join(' OR ')}`,
      fields.map(() => `%${query}%`)
    );

    return { data, total: parseInt(countResult[0]?.total || 0, 10) };
  }

  async index(entity, data) { return data; }
  async reindex(entity, items) { return items; }
  async deleteIndex() { return true; }
}

export const searchService = new SearchService(null);
