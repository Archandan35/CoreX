export class Translator {
  constructor() { this._translations = {}; }
  define(from, to, fn) { this._translations[`${from}:${to}`] = fn; }
  translate(value, from, to) {
    const fn = this._translations[`${from}:${to}`];
    return fn ? fn(value) : value;
  }
}

export const databaseTranslator = new Translator();
export const schemaTranslator = new Translator();
export const permissionTranslator = new Translator();
export const languageTranslator = new Translator();
export const themeTranslator = new Translator();
export const backupTranslator = new Translator();
export const notificationTranslator = new Translator();

databaseTranslator.define('entity', 'schema', (entity) => ({
  table: entity.resource || 'unknown',
  columns: Object.keys(entity).map(key => ({
    name: key, type: typeof entity[key] === 'number' ? 'integer' : typeof entity[key] === 'boolean' ? 'boolean' : entity[key] instanceof Date ? 'timestamp' : 'text',
    nullable: entity[key] === null || entity[key] === undefined,
  }))
}));
databaseTranslator.define('schema', 'ddl:create', (schema) =>
  `CREATE TABLE IF NOT EXISTS ${schema.table} (${schema.columns.map(c => `${c.name} ${c.type.toUpperCase()}${c.nullable ? '' : ' NOT NULL'}`).join(', ')});`
);

schemaTranslator.define('user:entity', 'database:table', () => ({
  name: 'users', columns: [
    { name: 'id', type: 'uuid', primaryKey: true },
    { name: 'email', type: 'varchar(255)', unique: true, nullable: false },
    { name: 'name', type: 'varchar(255)', nullable: false },
    { name: 'password', type: 'varchar(255)', nullable: false },
    { name: 'role', type: 'varchar(100)' },
    { name: 'permissions', type: 'jsonb' },
    { name: 'capabilities', type: 'jsonb' },
    { name: 'avatar', type: 'text' },
    { name: 'status', type: 'varchar(50)', default: "'active'" },
    { name: 'created_at', type: 'timestamp', default: 'NOW()' },
    { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
  ], indexes: [
    { name: 'idx_users_email', columns: ['email'], unique: true },
    { name: 'idx_users_role', columns: ['role'] },
    { name: 'idx_users_status', columns: ['status'] },
  ]
}));
schemaTranslator.define('role:entity', 'database:table', () => ({
  name: 'roles', columns: [
    { name: 'id', type: 'uuid', primaryKey: true },
    { name: 'name', type: 'varchar(255)', unique: true },
    { name: 'description', type: 'text' },
    { name: 'permissions', type: 'jsonb' },
    { name: 'created_at', type: 'timestamp', default: 'NOW()' },
    { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
  ], indexes: [{ name: 'idx_roles_name', columns: ['name'], unique: true }]
}));

permissionTranslator.define('action', 'permission', ({ resource, action }) => `${resource}.${action}`);
permissionTranslator.define('permission', 'action', (permission) => {
  const parts = permission.split('.'); return { resource: parts[0], action: parts.slice(1).join('.') };
});
permissionTranslator.define('rbac:role', 'authority:permissions', (role) => role.permissions || []);
permissionTranslator.define('authority:permissions', 'rbac:role', (permissions) => ({ permissions }));

languageTranslator.define('en', 'app.name', () => 'Universal Enterprise Application');
languageTranslator.define('en', 'nav.dashboard', () => 'Dashboard');
languageTranslator.define('en', 'nav.users', () => 'Users');
languageTranslator.define('en', 'nav.roles', () => 'Roles');
languageTranslator.define('en', 'nav.settings', () => 'Settings');
languageTranslator.define('en', 'auth.signIn', () => 'Sign In');
languageTranslator.define('en', 'auth.signOut', () => 'Sign Out');
languageTranslator.define('en', 'auth.welcomeBack', () => 'Welcome back');
languageTranslator.define('en', 'auth.email', () => 'Email');
languageTranslator.define('en', 'auth.password', () => 'Password');
languageTranslator.define('en', 'common.save', () => 'Save');
languageTranslator.define('en', 'common.cancel', () => 'Cancel');
languageTranslator.define('en', 'common.delete', () => 'Delete');
languageTranslator.define('en', 'common.edit', () => 'Edit');
languageTranslator.define('en', 'common.create', () => 'Create');
languageTranslator.define('en', 'common.search', () => 'Search');
languageTranslator.define('en', 'common.loading', () => 'Loading...');
languageTranslator.define('en', 'common.noData', () => 'No data found');
languageTranslator.define('en', 'common.refresh', () => 'Refresh');
languageTranslator.define('en', 'common.confirmDelete', () => 'Are you sure you want to delete this item? This action cannot be undone.');
languageTranslator.define('en', 'common.export', () => 'Export');
languageTranslator.define('en', 'common.import', () => 'Import');
languageTranslator.define('en', 'settings.title', () => 'Settings');
languageTranslator.define('en', 'settings.general', () => 'General');
languageTranslator.define('en', 'settings.appearance', () => 'Appearance');
languageTranslator.define('en', 'settings.security', () => 'Security');
languageTranslator.define('en', 'settings.notifications', () => 'Notifications');
languageTranslator.define('en', 'dashboard.title', () => 'Dashboard');
languageTranslator.define('en', 'users.title', () => 'Users');
languageTranslator.define('en', 'roles.title', () => 'Roles & Permissions');
languageTranslator.define('en', 'error.boundary', () => 'Something went wrong');
languageTranslator.define('en', 'error.notFound', () => 'Page Not Found');
languageTranslator.define('en', 'crud.create', () => 'Create');
languageTranslator.define('en', 'crud.edit', () => 'Edit');
languageTranslator.define('en', 'pagination.showing', () => 'Showing');
languageTranslator.define('en', 'pagination.of', () => 'of');
languageTranslator.define('en', 'pagination.entries', () => 'entries');
languageTranslator.define('en', 'export.csv', () => 'Export CSV');
languageTranslator.define('en', 'export.json', () => 'Export JSON');
languageTranslator.define('en', 'health.status', () => 'System Status');
languageTranslator.define('en', 'health.cpu', () => 'CPU');
languageTranslator.define('en', 'health.memory', () => 'Memory');
languageTranslator.define('en', 'health.storage', () => 'Storage');
languageTranslator.define('en', 'health.uptime', () => 'Uptime');
languageTranslator.define('en', 'analytics.users', () => 'User Analytics');
languageTranslator.define('en', 'analytics.usage', () => 'Usage Analytics');
languageTranslator.define('en', 'scheduler.tasks', () => 'Scheduled Tasks');

themeTranslator.define('light', 'css:variables', () => ({
  '--bg': '#ffffff', '--text': '#0f172a', '--border': '#e2e8f0',
}));
themeTranslator.define('dark', 'css:variables', () => ({
  '--bg': '#0f172a', '--text': '#f1f5f9', '--border': '#334155',
}));
themeTranslator.define('theme:name', 'theme:display', (name) =>
  name === 'dark' ? 'Dark Mode' : 'Light Mode'
);

backupTranslator.define('app:state', 'backup:format', (state) => ({
  version: '1.0', format: 'ueaf', createdAt: new Date().toISOString(),
  data: state,
}));
backupTranslator.define('backup:format', 'app:state', (backup) => backup.data);
backupTranslator.define('backup:format', 'backup:filename', (backup) =>
  `backup-${backup.createdAt?.split('T')[0] || 'unknown'}.uef.json`
);

notificationTranslator.define('success', 'toast:icon', () => 'check');
notificationTranslator.define('error', 'toast:icon', () => 'alert');
notificationTranslator.define('warning', 'toast:icon', () => 'warning');
notificationTranslator.define('info', 'toast:icon', () => 'info');

export default databaseTranslator;
