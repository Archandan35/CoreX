// Helper to generate the SECURITY DEFINER exec_sql function SQL.
// Used by SqlGenerator to include it in full-schema output.
// This is a separate utility so the SQL is defined in ONE place
// and shared between the generator and any other consumer.
export function buildExecSqlFunction() {
  return `CREATE OR REPLACE FUNCTION exec_sql(query_text text)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE query_text;
END;
$$;`;
}

// Helper to generate the check_admin_exists function SQL.
// Referenced by App.jsx and SupabaseAuth.js at runtime.
export function buildCheckAdminExistsFunction() {
  return `CREATE OR REPLACE FUNCTION public.check_admin_exists()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE full_access = true);
END;
$$;`;
}

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
  // Built-in functions required by the application runtime.
  // These are modeled here so SqlGenerator can produce them as part
  // of the canonical schema output whenever full-schema mode is used.
  exec_sql: {
    type: 'function',
    build: buildExecSqlFunction,
    description: 'SECURITY DEFINER helper for arbitrary SQL execution via RPC',
  },
  check_admin_exists: {
    type: 'function',
    build: buildCheckAdminExistsFunction,
    description: 'Checks whether at least one full_access administrator exists',
  },
};

SCHEMAS.version = 2;
SCHEMAS.extensions = [];
SCHEMAS.seedData = [];
