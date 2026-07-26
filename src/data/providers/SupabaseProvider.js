import { DatabaseProvider } from './index.js';

// Supabase does not expose arbitrary SQL over its REST API. Raw SQL execution
// is therefore routed through the `exec_sql(query_text text)` SECURITY DEFINER
// function that the schema-installation script (generate-sql.sql) creates in
// the target database. `exec_sql` RETURNS SETOF json, so PostgREST surfaces
// each row as a JSON object — we read `.data` and return it as the rows array,
// matching the contract every repository/service/validator already expects
// from `db.query(sql, params)` (they all do `result[0]?.column` / `result.map`).
//
// Important failure modes:
//   - If `exec_sql` is not installed yet (database not set up), the RPC returns
//     a 42883/404 "function not found". This is a legitimate, expected state
//     DURING setup, so we surface a clear, dedicated error rather than a raw
//     PostgREST blob, and let callers' try/catch treat it as "not ready".
//   - Parameter binding: we inline parameters as quoted/escaped literals into
//     the query text before sending, because exec_sql takes a single text
//     argument and cannot accept bind parameters through PostgREST. This is
//     safe (we control every caller's SQL and values) and mirrors how the
//     function is intended to be used.

const EXEC_SQL_NOT_INSTALLED_HINT =
  "The 'exec_sql' helper function is not installed in this database. " +
  'Run the generated schema SQL (which begins with CREATE FUNCTION exec_sql) ' +
  'in the Supabase SQL Editor, then try again.';

export class SupabaseProvider extends DatabaseProvider {
  async connect(config) {
    this.type = 'supabase';
    const { createClient } = await import('@supabase/supabase-js');
    this.client = createClient(config.url, config.anonKey);
  }

  async query(sql, params = []) {
    if (!this.client) throw new Error('Supabase not connected. Call connect() first.');

    const queryText = bindParams(sql, params);

    const { data, error } = await this.client.rpc('exec_sql', { query_text: queryText });

    if (error) {
      // PGRST202 / 42883: "Could not find the function public.exec_sql" — happens
      // before the schema is installed. Treat as a dedicated, recognizable error.
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

    // exec_sql RETURNS SETOF json → PostgREST returns an array of row objects.
    // When the underlying statement returns no rows, `data` is an empty array.
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

// Substitute `$1, $2, ...` placeholders in `sql` with safely-quoted literals
// built from `params`. exec_sql executes the final text server-side, so we must
// serialize JS values into valid SQL literals here.
function bindParams(sql, params) {
  if (!params || params.length === 0) return sql;
  let out = '';
  let paramIndex = 0;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (ch === '$' && /[1-9]/.test(sql[i + 1] || '')) {
      // Only treat $N as a placeholder when followed by a digit. (Multi-digit
      // placeholders like $10 are not used anywhere in this codebase, but we
      // support them for safety by consuming the full run of digits.)
      let num = '';
      let j = i + 1;
      while (j < sql.length && /[0-9]/.test(sql[j])) { num += sql[j]; j += 1; }
      const pos = parseInt(num, 10) - 1;
      if (pos >= 0 && pos < params.length) {
        out += literal(params[pos]);
        paramIndex += 1;
        i = j - 1;
        continue;
      }
    }
    out += ch;
  }
  return out;
}

function literal(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  // string — escape single quotes per SQL standard (doubled) and wrap in quotes.
  return `'${String(value).replace(/'/g, "''")}'`;
}
