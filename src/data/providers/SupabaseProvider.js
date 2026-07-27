import { DatabaseProvider } from './index.js';
import { bindInline } from '../sqlParams.js';
import { getSupabaseClient } from '../../identity/auth/supabaseClient.js';

const EXEC_SQL_NOT_INSTALLED_HINT =
  "The 'exec_sql' helper function is not installed in this database. " +
  'Run the generated schema SQL in the Supabase SQL Editor, then try again.';

export class SupabaseProvider extends DatabaseProvider {
  async connect() {
    this.type = 'supabase';
    if (this.client) return;
    this.client = await getSupabaseClient();
  }

  async query(sql, params = []) {
    if (!this.client) throw new Error('Supabase not connected. Call connect() first.');

    const queryText = bindInline(sql, params);

    const { data, error } = await this.client.rpc('exec_sql', { query_text: queryText });

    if (error) {
      const code = error.code || '';
      const message = (error.message || '').toLowerCase();
      const notInstalled =
        code === 'PGRST202' ||
        code === '42883' ||
        message.includes('exec_sql') ||
        message.includes('could not find the function');
      if (notInstalled) {
        throw new Error(EXEC_SQL_NOT_INSTALLED_HINT);
      }
      throw new Error(error.message || 'Supabase RPC exec_sql failed.');
    }

    return Array.isArray(data) ? data : [];
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
