export const CONTRACTS = Object.freeze({
  repository: {
    findAll: 'async findAll(user, options) => []',
    findById: 'async findById(id, user) => object|null',
    create: 'async create(data, user) => object',
    update: 'async update(id, data, user) => object|null',
    delete: 'async delete(id, user) => boolean',
  },
  service: {
    list: 'async list(user, options) => { data, meta }',
    get: 'async get(id, user) => object|null',
    create: 'async create(data, user) => object',
    update: 'async update(id, data, user) => object|null',
    delete: 'async delete(id, user) => boolean',
  },
  provider: {
    connect: 'async connect(config) => void',
    query: 'async query(sql, params) => []',
    disconnect: 'async disconnect() => void',
  },
});

export function checkContract(impl, contract) {
  const missing = [];
  for (const key of Object.keys(contract)) {
    if (typeof impl[key] !== 'function') {
      missing.push(key);
    }
  }
  return missing;
}
