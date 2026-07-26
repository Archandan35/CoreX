export class CrudEngine {
  constructor(repository, options = {}) {
    this.repository = repository;
    this.options = options;
  }

  async list(user, params = {}) {
    const options = {
      page: params.page || 1,
      perPage: params.perPage || 20,
      sort: params.sort,
      search: params.search,
      filters: params.filters,
    };
    return this.repository.findAll(user, options);
  }

  async get(id, user) {
    return this.repository.findById(id, user);
  }

  async create(data, user) {
    return this.repository.create(data, user);
  }

  async update(id, data, user) {
    return this.repository.update(id, data, user);
  }

  async delete(id, user) {
    return this.repository.delete(id, user);
  }

  async batchDelete(ids, user) {
    const results = [];
    for (const id of ids) {
      results.push({ id, deleted: await this.delete(id, user) });
    }
    return results;
  }

  async exists(id, user) {
    const record = await this.get(id, user);
    return !!record;
  }
}
