import { config } from '../config/index.js';
import { SupabaseProvider } from './providers/SupabaseProvider.js';

let dbInstance = null;

export async function initDatabase(providerType, providerConfig) {
  const type = providerType || config.databaseProvider;
  if (type && type !== 'supabase') {
    throw new Error(`Unsupported database provider: ${type}. Only 'supabase' is supported.`);
  }

  const cfg = providerConfig || {};

  const provider = new SupabaseProvider();
  await provider.connect({
    url: cfg.url || config.supabaseUrl,
    anonKey: cfg.anonKey || config.supabaseAnonKey,
  });

  const db = {
    provider,
    users: null,
    roles: null,
    settings: null,
    query: (sql, params) => provider.query(sql, params),
    isSupabase: true,
    supabase: provider.getClient(),
    _databaseName: (cfg.url || config.supabaseUrl)?.match(/https:\/\/([^.]+)/)?.[1] || 'Supabase',
  };

  dbInstance = db;
  return db;
}

export function getDatabase() {
  if (!dbInstance) throw new Error('Database not initialized. Call initDatabase() first.');
  return dbInstance;
}