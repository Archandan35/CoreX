# SQL Generation Pipeline Rewrite - Complete

## Root Causes Fixed

1. **DatabaseValidator.**Fixes:
   - Removed dead `_functionsDetectionComplete` flag
   - Strategy 3 probes each function independently (no early exit)
   - `_checkRequiredFunctions()` always checks `exec_sql`, `check_admin_exists`, `is_admin_user`
   - All function records include `type: 'function'` for correct matching

2. **generate-sql.sql** - Restored full canonical schema:
   - All 3 helper functions (exec_sql, check_admin_exists, is_admin_user) with GRANT EXECUTE
   - All 3 tables (users, roles, settings)
   - Indexes, all 5 RLS policies, user profile trigger
   - Schema version table + NOTIFY pgrst

3. **SqlGenerator.js** - Verified correct:
   - `_genHelperFunctions()` emits all 3 functions when missing or full mode
   - `_genRLS()` includes all 5 policies
   - Single code path for preview and download

## Status: COMPLETE
