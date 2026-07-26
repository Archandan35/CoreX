export const INDEXES = Object.freeze({
  users: [
    { name: 'idx_users_email', columns: ['email'], unique: true },
    { name: 'idx_users_role', columns: ['role'] },
    { name: 'idx_users_status', columns: ['status'] },
    { name: 'idx_users_created_at', columns: ['created_at'] },
  ],
  roles: [
    { name: 'idx_roles_name', columns: ['name'], unique: true },
  ],
  settings: [
    { name: 'idx_settings_key', columns: ['key'], unique: true },
  ],
});

export function generateCreateIndexSQL(table) {
  const indexes = INDEXES[table];
  if (!indexes) return [];

  return indexes.map((idx) => {
    const cols = idx.columns.join(', ');
    const unique = idx.unique ? 'UNIQUE ' : '';
    return `CREATE ${unique}INDEX IF NOT EXISTS ${idx.name} ON ${table} (${cols});`;
  });
}
