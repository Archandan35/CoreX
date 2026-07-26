// Helpers for serializing JS values into SQL literals and inlining `$1, $2, ...`
// placeholders into a query string. Used where a single-text SQL argument must
// carry bound parameters (e.g. the `exec_sql(query_text text)` SECURITY DEFINER
// RPC, which cannot accept separate bind params through PostgREST).

export function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  // string — escape single quotes per SQL standard (doubled) and wrap in quotes.
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function bindInline(sql, params) {
  if (!params || params.length === 0) return sql;
  let out = '';
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (ch === '$' && /[1-9]/.test(sql[i + 1] || '')) {
      // Consume the full run of digits to support $1..$9 (and beyond if ever used).
      let num = '';
      let j = i + 1;
      while (j < sql.length && /[0-9]/.test(sql[j])) { num += sql[j]; j += 1; }
      const pos = parseInt(num, 10) - 1;
      if (pos >= 0 && pos < params.length) {
        out += sqlLiteral(params[pos]);
        i = j - 1;
        continue;
      }
    }
    out += ch;
  }
  return out;
}
