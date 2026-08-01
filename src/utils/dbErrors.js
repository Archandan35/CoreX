// Shared helpers for interpreting Supabase/PostgREST errors.
//
// IMPORTANT: a table that has never been created is NOT reported as Postgres's
// raw `42P01` ("undefined_table") by PostgREST in the normal case — it's
// reported as `PGRST205` ("Could not find the table ... in the schema cache"),
// because PostgREST resolves table names against its own schema cache rather
// than asking Postgres directly. `42P01` can still occur in some edge cases
// (e.g. referencing a table PostgREST's cache thinks exists but Postgres does
// not), so both codes — plus a message-based fallback — must be checked.
// Missing a code here makes every caller silently treat an absent table as
// present, which previously caused the Setup Wizard to under-report missing
// objects during Schema Analysis / Verify Installation.

export function isMissingTableError(error) {
  if (!error) return false;
  const code = error.code || '';
  if (code === '42P01' || code === 'PGRST205' || code === 'PGRST204') return true;
  const message = (error.message || '').toLowerCase();
  return message.includes('does not exist') || message.includes('schema cache');
}

export function isMissingColumnError(error) {
  if (!error) return false;
  const code = error.code || '';
  if (code === '42703') return true;
  const message = (error.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
}

// Human-friendly explanation for a schema/schema-cache error, used so features
// stop surfacing raw PostgREST noise like "Could not find the table
// 'public.product_units' in the schema cache" and instead tell the user what to
// do. Returns '' when the error is not schema-related (callers fall back to the
// original message).
export function describeSchemaError(error) {
  if (!error) return '';
  if (isMissingColumnError(error)) {
    return (
      'A required database column is missing. Run the Setup Wizard (or reload the app to ' +
      'auto-repair) so the latest schema is applied, then try again.'
    );
  }
  if (isMissingTableError(error)) {
    const raw = String(error.message || '');
    const tableMatch =
      raw.match(/table\s+['"]?([a-zA-Z_][a-zA-Z0-9_.]*)['"]?/i) ||
      raw.match(/relation\s+['"]?([a-zA-Z_][a-zA-Z0-9_.]*)['"]?/i) ||
      raw.match(/['"]([a-zA-Z_][a-zA-Z0-9_.]*)['"]/);
    const object = tableMatch && tableMatch[1] ? ` '${tableMatch[1]}'` : '';
    return (
      `A required database table${object} is missing or the schema cache is out of date. ` +
      'Run the Setup Wizard (or reload the app to auto-repair) so the latest schema is applied, then try again.'
    );
  }
  return '';
}
