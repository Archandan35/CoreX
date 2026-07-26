import { FilterBuilder } from '../filtering/index.js';
import { SearchBuilder } from '../search/index.js';
import { SortBuilder } from '../sorting/index.js';
import { Paginator } from '../pagination/index.js';

export default class BaseRepository {
  constructor(model, db) {
    this.model = model;
    this.db = db;
    this.table = model.table;
    this.columns = model.columns;
    this.pk = model.primaryKey || 'id';
    this.searchableFields = model.searchableFields || [];
  }

  applyRls(user) {
    if (!this.model.rls) return {};
    const policy = this.model.rlsPolicy(user);
    if (policy.filter === false) return { denied: true };
    return policy;
  }

  async findAll(user, options = {}) {
    const rls = this.applyRls(user);
    if (rls.denied) return [];

    const filter = new FilterBuilder();
    const search = new SearchBuilder();
    const sort = new SortBuilder().allow(this.columns);
    const paginator = new Paginator(options.page, options.perPage);

    if (options.search && this.searchableFields.length > 0) {
      search.search(options.search, this.searchableFields);
    }

    if (options.sort) {
      const parts = options.sort.split(',');
      parts.forEach((part) => {
        const trimmed = part.trim();
        if (trimmed.startsWith('-')) sort.orderBy(trimmed.slice(1), 'DESC');
        else if (trimmed.startsWith('+')) sort.orderBy(trimmed.slice(1), 'ASC');
        else sort.orderBy(trimmed, 'ASC');
      });
    }

    if (options.filters) {
      options.filters.forEach((f) => {
        if (f.operator === 'IN') filter.whereIn(f.field, f.value);
        else if (f.operator === 'LIKE') filter.whereLike(f.field, f.value);
        else filter.where(f.field, f.operator || '=', f.value);
      });
    }

    if (rls.filter) {
      Object.entries(rls.filter).forEach(([key, value]) => {
        filter.where(key, '=', value);
      });
    }

    let query = `SELECT ${this.columns.join(', ')} FROM ${this.table}`;
    let countQuery = `SELECT COUNT(*) as total FROM ${this.table}`;

    const whereParts = [];
    const allParams = [];

    const f = filter.build();
    if (f.clause) {
      whereParts.push(f.clause.replace('WHERE ', ''));
      allParams.push(...f.params);
    }

    const s = search.build();
    if (s.clause) {
      whereParts.push(s.clause);
      allParams.push(...s.params);
    }

    if (whereParts.length > 0) {
      const whereClause = `WHERE ${whereParts.join(' AND ')}`;
      query += ` ${whereClause}`;
      countQuery += ` ${whereClause}`;
    }

    const sorter = sort.build();
    if (sorter.clause) {
      query += ` ${sorter.clause}`;
    }

    if (options.page || options.perPage) {
      query = paginator.apply(query);
    }

    const rows = await this.db.query(query, allParams);

    if (options.page || options.perPage) {
      const countResult = await this.db.query(countQuery, allParams);
      const total = parseInt(countResult[0]?.total || countResult[0]?.count || rows.length, 10);
      return { data: rows, meta: paginator.buildMeta(total) };
    }

    return rows;
  }

  async findById(id, user) {
    const rls = this.applyRls(user);
    if (rls.denied) return null;
    const result = await this.db.query(
      `SELECT ${this.columns.join(', ')} FROM ${this.table} WHERE ${this.pk} = $1`,
      [id]
    );
    return result[0] || null;
  }

  async create(data, user) {
    const rls = this.applyRls(user);
    if (rls.denied) return null;

    if (this.model.rls) {
      const hasWrite = user?.permissions?.includes(`${this.table.slice(0, -1)}:create`) || user?.permissions?.includes('*');
      if (!hasWrite && !rls.filter) return null;
    }

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`);
    const result = await this.db.query(
      `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING ${this.columns.join(', ')}`,
      values
    );
    return result[0] || null;
  }

  async update(id, data, user) {
    const rls = this.applyRls(user);
    if (rls.denied) return null;

    if (this.model.rls) {
      const hasWrite = user?.permissions?.includes(`${this.table.slice(0, -1)}:update`) || user?.permissions?.includes('*');
      if (!hasWrite) return null;
    }

    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);
    values.push(id);
    const result = await this.db.query(
      `UPDATE ${this.table} SET ${setClauses.join(', ')} WHERE ${this.pk} = $${values.length} RETURNING ${this.columns.join(', ')}`,
      values
    );
    return result[0] || null;
  }

  async delete(id, user) {
    const rls = this.applyRls(user);
    if (rls.denied) return false;

    if (this.model.rls) {
      const hasWrite = user?.permissions?.includes(`${this.table.slice(0, -1)}:delete`) || user?.permissions?.includes('*');
      if (!hasWrite) return false;
    }

    const result = await this.db.query(
      `DELETE FROM ${this.table} WHERE ${this.pk} = $1 RETURNING ${this.pk}`,
      [id]
    );
    return result.length > 0;
  }
}
