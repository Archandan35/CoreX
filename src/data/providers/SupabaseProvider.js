import { DatabaseProvider } from './index.js';

export class SupabaseProvider extends DatabaseProvider {
  async connect(config) {
    this.type = 'supabase';
    const { createClient } = await import('@supabase/supabase-js');
    this.client = createClient(config.url, config.anonKey);
  }

  async query(sql, params = []) {
    throw new Error('SupabaseProvider does not support raw SQL queries. Use getClient() for Supabase queries.');
  }

  getClient() {
    if (!this.client) throw new Error('Supabase not connected. Call connect() first.');
    return this.client;
  }

  table(name) {
    return this.getClient().from(name);
  }

  async disconnect() {
  }
}
