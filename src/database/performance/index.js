export const INDEX_TYPES = Object.freeze({
  BTREE: 'btree',
  HASH: 'hash',
  GIN: 'gin',
  GIST: 'gist',
  BRIN: 'brin',
  UNIQUE: 'unique',
  COMPOSITE: 'composite',
  PARTIAL: 'partial',
  COVERING: 'covering',
});

export function createIndexSQL(table, column, type = 'btree', options = {}) {
  const name = options.name || `idx_${table}_${column}`;
  const unique = type === 'unique' || options.unique ? 'UNIQUE ' : '';
  const using = type === 'hash' ? 'USING HASH ' : type === 'gin' ? 'USING GIN ' : type === 'brin' ? 'USING BRIN ' : '';
  const where = options.where ? ` WHERE ${options.where}` : '';
  const include = options.include ? ` INCLUDE (${options.include.join(', ')})` : '';
  return `CREATE ${unique}INDEX IF NOT EXISTS ${name} ON ${table} ${using}(${column})${include}${where};`;
}

export function createCompositeIndexSQL(table, columns, options = {}) {
  const name = options.name || `idx_${table}_${columns.join('_')}`;
  const unique = options.unique ? 'UNIQUE ' : '';
  return `CREATE ${unique}INDEX IF NOT EXISTS ${name} ON ${table} (${columns.join(', ')});`;
}

export function createPartialIndexSQL(table, column, where, options = {}) {
  const name = options.name || `idx_${table}_${column}_partial`;
  const unique = options.unique ? 'UNIQUE ' : '';
  return `CREATE ${unique}INDEX IF NOT EXISTS ${name} ON ${table} (${column}) WHERE ${where};`;
}

export function createMaterializedViewSQL(name, query, options = {}) {
  const unique = options.uniqueIndex ? ` UNIQUE (${options.uniqueIndex})` : '';
  return `CREATE MATERIALIZED VIEW IF NOT EXISTS ${name} AS ${query} WITH DATA; CREATE${unique} INDEX IF NOT EXISTS idx_${name}_id ON ${name} (id);`;
}

export function refreshMaterializedViewSQL(name) {
  return `REFRESH MATERIALIZED VIEW CONCURRENTLY ${name};`;
}

export function analyzeTableSQL(table) {
  return `ANALYZE ${table};`;
}

export function vacuumTableSQL(table) {
  return `VACUUM ANALYZE ${table};`;
}

export const PERFORMANCE_SETTINGS = {
  postgres: {
    effective_cache_size: '4GB',
    work_mem: '64MB',
    maintenance_work_mem: '256MB',
    shared_buffers: '1GB',
    random_page_cost: 1.1,
    effective_io_concurrency: 200,
  },
};

export function createFullTextSearchIndexSQL(table, column, language = 'english') {
  return `CREATE INDEX IF NOT EXISTS idx_${table}_${column}_fts ON ${table} USING GIN (to_tsvector('${language}', ${column}));`;
}

export function createTrigramIndexSQL(table, column) {
  return `CREATE INDEX IF NOT EXISTS idx_${table}_${column}_trgm ON ${table} USING GIN (${column} gin_trgm_ops);`;
}
