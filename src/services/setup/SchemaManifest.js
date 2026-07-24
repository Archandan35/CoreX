const VERSION = '1.3.0';

const MANIFEST = {
  version: VERSION,
  appName: 'CoreX',

  schemas: ['public'],

  extensions: [
    { name: 'pgcrypto', required: true },
    { name: 'uuid-ossp', required: true },
  ],

  enums: [],

  domains: [],

  sequences: [],

  tables: [
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()', nullable: false },
        { name: 'email', type: 'VARCHAR(255)', unique: true, nullable: false },
        { name: 'name', type: 'VARCHAR(255)', nullable: false },
        { name: 'password', type: 'VARCHAR(255)' },
        { name: 'role', type: 'VARCHAR(100)', default: "'user'" },
        { name: 'permissions', type: 'TEXT[]', default: "'{}'" },
        { name: 'status', type: 'VARCHAR(20)', default: "'active'", check: "status IN ('active', 'inactive', 'suspended')" },
        { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
        { name: 'updated_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
      ],
      foreignKeys: [],
      indexes: [
        { name: 'idx_users_role', columns: ['role'] },
        { name: 'idx_users_status', columns: ['status'] },
      ],
      rls: true,
      triggers: ['set_updated_at'],
      policies: ['users_select_own', 'admin_all_access'],
    },
    {
      name: 'roles',
      columns: [
        { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()', nullable: false },
        { name: 'code', type: 'VARCHAR(100)', unique: true, nullable: false },
        { name: 'name', type: 'VARCHAR(100)', nullable: false },
        { name: 'description', type: 'TEXT' },
        { name: 'permissions', type: 'TEXT[]', default: "'{}'" },
        { name: 'all', type: 'BOOLEAN', default: 'FALSE' },
        { name: 'inherits', type: 'TEXT[]', default: "'{}'" },
        { name: 'system', type: 'BOOLEAN', default: 'FALSE' },
        { name: 'status', type: 'VARCHAR(20)', default: "'Active'", check: "status IN ('Active', 'Inactive')" },
        { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
        { name: 'updated_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
      ],
      foreignKeys: [],
      indexes: [
        { name: 'idx_roles_code', columns: ['code'], unique: true },
        { name: 'idx_roles_system', columns: ['system'] },
      ],
      rls: true,
      triggers: ['set_updated_at'],
      policies: [],
    },
    {
      name: 'permissions',
      columns: [
        { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()', nullable: false },
        { name: 'code', type: 'VARCHAR(100)', unique: true, nullable: false },
        { name: 'label', type: 'VARCHAR(255)', nullable: false },
        { name: 'category', type: 'VARCHAR(100)' },
        { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
      ],
      foreignKeys: [],
      indexes: [
        { name: 'idx_permissions_category', columns: ['category'] },
      ],
      rls: false,
      triggers: [],
      policies: [],
    },
    {
      name: 'settings',
      columns: [
        { name: 'key', type: 'VARCHAR(255)', primaryKey: true, nullable: false },
        { name: 'value', type: 'JSONB' },
        { name: 'updated_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
      ],
      foreignKeys: [],
      indexes: [],
      rls: false,
      triggers: [],
      policies: [],
    },
    {
      name: 'audit_logs',
      columns: [
        { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()', nullable: false },
        { name: 'action', type: 'VARCHAR(100)', nullable: false },
        { name: 'module', type: 'VARCHAR(100)' },
        { name: 'user_id', type: 'UUID', references: { table: 'users', column: 'id' } },
        { name: 'details', type: 'JSONB' },
        { name: 'ip_address', type: 'VARCHAR(45)' },
        { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
      ],
      foreignKeys: [
        { columns: ['user_id'], references: { table: 'users', columns: ['id'] } },
      ],
      indexes: [
        { name: 'idx_audit_logs_user_id', columns: ['user_id'] },
        { name: 'idx_audit_logs_action', columns: ['action'] },
        { name: 'idx_audit_logs_created_at', columns: ['created_at'] },
      ],
      rls: false,
      triggers: ['audit_log_insert'],
      policies: [],
    },
    {
      name: 'sessions',
      columns: [
        { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()', nullable: false },
        { name: 'user_id', type: 'UUID', references: { table: 'users', column: 'id' } },
        { name: 'token', type: 'VARCHAR(500)', nullable: false },
        { name: 'expires_at', type: 'TIMESTAMPTZ' },
        { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
      ],
      foreignKeys: [
        { columns: ['user_id'], references: { table: 'users', columns: ['id'] } },
      ],
      indexes: [
        { name: 'idx_sessions_token', columns: ['token'] },
        { name: 'idx_sessions_expires_at', columns: ['expires_at'] },
      ],
      rls: false,
      triggers: [],
      policies: [],
    },
    {
      name: 'notifications',
      columns: [
        { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()', nullable: false },
        { name: 'user_id', type: 'UUID', references: { table: 'users', column: 'id' } },
        { name: 'title', type: 'VARCHAR(255)', nullable: false },
        { name: 'body', type: 'TEXT' },
        { name: 'read', type: 'BOOLEAN', default: 'FALSE' },
        { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
      ],
      foreignKeys: [
        { columns: ['user_id'], references: { table: 'users', columns: ['id'] } },
      ],
      indexes: [
        { name: 'idx_notifications_user_id', columns: ['user_id'] },
        { name: 'idx_notifications_read', columns: ['read'] },
        { name: 'idx_notifications_created_at', columns: ['created_at'] },
      ],
      rls: false,
      triggers: [],
      policies: [],
    },
  ],

  views: [],

  materializedViews: [],

  functions: [
    {
      name: 'is_first_install',
      type: 'function',
      params: [],
      returns: 'BOOLEAN',
      language: 'sql',
      security: 'SECURITY DEFINER',
      body: `SELECT NOT EXISTS (SELECT 1 FROM public.users);`,
    },
    {
      name: 'has_admin_user',
      type: 'function',
      params: [],
      returns: 'BOOLEAN',
      language: 'sql',
      security: 'SECURITY DEFINER',
      body: `SELECT EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role = r.code WHERE r."all" = TRUE);`,
    },
    {
      name: 'check_permission',
      type: 'function',
      params: [
        { name: 'user_id', type: 'UUID' },
        { name: 'required_perm', type: 'VARCHAR' },
      ],
      returns: 'BOOLEAN',
      language: 'plpgsql',
      security: 'SECURITY DEFINER',
      body: `DECLARE\n  user_perms TEXT[];\nBEGIN\n  SELECT permissions INTO user_perms FROM users WHERE id = user_id;\n  RETURN user_perms @> ARRAY[required_perm::TEXT] OR user_perms @> ARRAY['*'];\nEND;`,
    },
    {
      name: 'hash_password',
      type: 'function',
      params: [
        { name: 'plain', type: 'TEXT' },
      ],
      returns: 'TEXT',
      language: 'plpgsql',
      security: 'SECURITY DEFINER',
      body: `BEGIN\n  RETURN crypt(plain, gen_salt('bf'));\nEND;`,
    },
    {
      name: 'update_timestamp',
      type: 'function',
      params: [],
      returns: 'TRIGGER',
      language: 'plpgsql',
      body: `BEGIN\n  NEW.updated_at = NOW();\n  RETURN NEW;\nEND;`,
    },
    {
      name: 'function_exists',
      type: 'function',
      params: [
        { name: 'func_name', type: 'TEXT' },
      ],
      returns: 'BOOLEAN',
      language: 'plpgsql',
      security: 'SECURITY DEFINER',
      body: `BEGIN\n  RETURN EXISTS (SELECT 1 FROM pg_proc WHERE proname = func_name AND pronamespace = 'public'::regnamespace);\nEND;`,
    },
  ],

  procedures: [],

  triggers: [
    {
      name: 'set_updated_at',
      table: 'users',
      timing: 'BEFORE',
      event: 'UPDATE',
      function: 'update_timestamp',
    },
    {
      name: 'audit_log_insert',
      table: 'audit_logs',
      timing: 'AFTER',
      event: 'INSERT',
      function: 'update_timestamp',
    },
  ],

  rlsPolicies: [
    {
      name: 'users_select_own',
      table: 'users',
      command: 'SELECT',
      using: "id = current_setting('app.user_id')::UUID",
    },
    {
      name: 'admin_all_access',
      table: 'users',
      command: 'ALL',
      using: "EXISTS (SELECT 1 FROM public.roles r WHERE r.code = current_setting('app.user_role') AND r.\"all\" = TRUE)",
    },
  ],

  grants: [
    { type: 'EXECUTE', function: 'is_first_install', params: [], role: 'anon' },
    { type: 'EXECUTE', function: 'has_admin_user', params: [], role: 'anon' },
  ],

  defaultPrivileges: [],

  storageBuckets: [],

  storagePolicies: [],

  seedData: [],

  versionMetadata: {
    schema_version: VERSION,
  },
};

export default MANIFEST;

export function getTable(name) {
  return MANIFEST.tables.find(t => t.name === name);
}

export function getFunction(name) {
  return MANIFEST.functions.find(f => f.name === name);
}

export function getTrigger(name) {
  return MANIFEST.triggers.find(t => t.name === name);
}

export function getPolicy(name) {
  return MANIFEST.rlsPolicies.find(p => p.name === name);
}

export function getAllNames(type) {
  const mapping = {
    tables: MANIFEST.tables.map(t => t.name),
    functions: MANIFEST.functions.map(f => f.name),
    triggers: MANIFEST.triggers.map(t => t.name),
    policies: MANIFEST.rlsPolicies.map(p => p.name),
    indexes: MANIFEST.tables.flatMap(t => t.indexes.map(i => i.name)),
    columns: MANIFEST.tables.flatMap(t => t.columns.map(c => `${t.name}.${c.name}`)),
  };
  return mapping[type] || [];
}

export function resolveDependencyOrder() {
  const order = [];
  const added = new Set();

  for (const ext of MANIFEST.extensions) {
    order.push({ type: 'extension', name: ext.name, def: ext });
    added.add(`ext:${ext.name}`);
  }

  for (const table of MANIFEST.tables) {
    order.push({ type: 'table', name: table.name, def: table });
    added.add(`table:${table.name}`);
  }

  for (const table of MANIFEST.tables) {
    for (const col of table.columns) {
      order.push({ type: 'column', name: `${table.name}.${col.name}`, def: { ...col, table: table.name } });
      added.add(`column:${table.name}.${col.name}`);
    }
    for (const idx of table.indexes) {
      order.push({ type: 'index', name: idx.name, def: { ...idx, table: table.name } });
      added.add(`index:${idx.name}`);
    }
  }

  for (const view of MANIFEST.views) {
    order.push({ type: 'view', name: view.name, def: view });
    added.add(`view:${view.name}`);
  }

  for (const mView of MANIFEST.materializedViews) {
    order.push({ type: 'materializedView', name: mView.name, def: mView });
    added.add(`mv:${mView.name}`);
  }

  for (const fn of MANIFEST.functions) {
    order.push({ type: 'function', name: fn.name, def: fn });
    added.add(`func:${fn.name}`);
  }

  for (const trigger of MANIFEST.triggers) {
    order.push({ type: 'trigger', name: trigger.name, def: trigger });
    added.add(`trigger:${trigger.name}`);
  }

  for (const grant of MANIFEST.grants) {
    order.push({ type: 'grant', name: `grant_${grant.function}`, def: grant });
    added.add(`grant:${grant.function}`);
  }

  for (const table of MANIFEST.tables) {
    if (table.rls) {
      order.push({ type: 'rlsEnable', name: `rls:${table.name}`, def: table });
      added.add(`rls:${table.name}`);
    }
  }

  for (const policy of MANIFEST.rlsPolicies) {
    order.push({ type: 'policy', name: policy.name, def: policy });
    added.add(`policy:${policy.name}`);
  }

  if (MANIFEST.versionMetadata) {
    order.push({ type: 'metadata', name: 'version_metadata', def: MANIFEST.versionMetadata });
  }

  for (const seed of MANIFEST.seedData) {
    order.push({ type: 'seedData', name: `seed_${seed.table}`, def: seed });
  }

  return order;
}
