# Fix: `on_auth_user_created` Trigger Reported as Missing

## Steps

### 1. Update `exec_sql` function in `SetupWizard.jsx`
- [✅] Add `SET search_path = public` to the `execSqlFn` const in `SetupWizard.jsx`
- Reason: SECURITY DEFINER functions require explicit search_path in modern PostgreSQL

### 2. Update `exec_sql` function in `generate-sql.sql`
- [✅] Add `SET search_path = public` to match the JSX definition

### 3. Improve `DatabaseValidator._checkTriggers()` error handling
- [✅] Capture pg_catalog query errors explicitly (instead of silent return)
- [✅] Surface detailed error message when `exec_sql` function is missing
- [✅] Differentiate between "trigger not found" and "could not check trigger"

### 4. Update `SqlGenerator.generate()` for trigger detection
- [✅] Only generate the trigger SQL when `on_auth_user_created` is actually in the missing objects list
- [✅] This ensures the "Objects to Create" count accurately reflects what will be generated

### 5. All changes verified
- [✅] Files edited:
  - `src/setup-wizard/SetupWizard.jsx` — `execSqlFn` now includes `SET search_path = public`
  - `generate-sql.sql` — `exec_sql` function now includes `SET search_path = public`
  - `src/setup-wizard/DatabaseValidator.js` — Better error capture and diagnostics in `_checkTriggers()`
  - `src/setup-wizard/SqlGenerator.js` — Conditional trigger generation based on report

