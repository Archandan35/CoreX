export const ROLE_ENUM = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  VIEWER: 'viewer',
});

export const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
});

export const SETTING_TYPE = Object.freeze({
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  JSON: 'json',
  IMAGE: 'image',
  FILE: 'file',
});

export const AUTH_PROVIDER = Object.freeze({
  SUPABASE: 'supabase',
  FIREBASE: 'firebase',
  AUTH0: 'auth0',
  CLERK: 'clerk',
  CUSTOM: 'custom',
});

export const DATABASE_PROVIDER = Object.freeze({
  SUPABASE: 'supabase',
  POSTGRES: 'postgres',
  MYSQL: 'mysql',
  SQLITE: 'sqlite',
  MONGODB: 'mongodb',
  MEMORY: 'memory',
});

export const STORAGE_PROVIDER = Object.freeze({
  SUPABASE: 'supabase',
  S3: 's3',
  CLOUDFLARE: 'cloudflare',
  AZURE: 'azure',
  GCP: 'gcp',
  LOCAL: 'local',
});

export const SEARCH_PROVIDER = Object.freeze({
  POSTGRES: 'postgres',
  ELASTICSEARCH: 'elasticsearch',
  MEILISEARCH: 'meilisearch',
  TYPESENSE: 'typesense',
  ALGOLIA: 'algolia',
});

export const LOG_LEVEL = Object.freeze({
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
});

export const THEME_MODE = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
});

export const PERMISSION_EFFECT = Object.freeze({
  ALLOW: 'allow',
  DENY: 'deny',
  CONDITIONAL: 'conditional',
});

export const ENTITY_TYPE = Object.freeze({
  USER: 'user',
  ROLE: 'role',
  SETTING: 'setting',
});
