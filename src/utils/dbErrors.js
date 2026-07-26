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
