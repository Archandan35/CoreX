export const SCHEMAS = {
  users: {
    table: 'users',
    columns: ['id', 'name', 'email', 'phone', 'password_hash', 'role_label', 'full_access', 'permissions', 'status', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', email: 'TEXT', phone: 'TEXT', password_hash: 'TEXT', role_label: 'TEXT', full_access: 'BOOLEAN', permissions: 'TEXT[]', status: 'TEXT', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['phone', 'role_label', 'permissions', 'password_hash'],
    defaults: { full_access: 'false', status: "'active'", created_at: 'NOW()', updated_at: 'NOW()' },
    unique: { email: 'email' },
    rls: true,
    searchableFields: ['name', 'email', 'phone'],
  },
  roles: {
    table: 'roles',
    columns: ['id', 'name', 'label', 'description', 'permissions', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', label: 'TEXT', description: 'TEXT', permissions: 'TEXT[]', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['description'],
    defaults: { created_at: 'NOW()', updated_at: 'NOW()' },
    unique: { name: 'name' },
  },
  settings: {
    table: 'settings',
    columns: ['key', 'value', 'updated_at'],
    columnTypes: { key: 'TEXT', value: 'TEXT', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'key',
    nullable: ['value'],
    defaults: { updated_at: 'NOW()' },
  },
};

SCHEMAS.version = 2;
SCHEMAS.extensions = [];
SCHEMAS.seedData = [];
