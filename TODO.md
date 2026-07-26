# SQL Generation Pipeline Fix - TODO

## Root Cause
3 architectural issues causing divergence between SqlGenerator.js and generate-sql.sql:

1. **DatabaseValidator skips function/trigger/policy checks when no tables exist** (fresh DB)
2. **DatabaseValidator doesn't cross-reference functions against schema** (never reports missing functions)
3. **SetupWizard.jsx prepends exec_sql outside SqlGenerator** (dual code path)

## Steps

### Step 1: `src/schema/models/index.js`
- [x] Add `is_admin_user` function definition to the schema model
- [x] Add `buildIsAdminUserFunction()` export

### Step 2: `src/setup-wizard/DatabaseValidator.js`
- [x] Add `_checkRequiredFunctions()` that cross-references schema's function definitions
- [x] Remove `someTableExists` guard so functions/triggers/policies are always checked
- [x] Ensure missing functions are added to the report

### Step 3: `src/setup-wizard/SqlGenerator.js`
- [x] In delta mode, include ALL helper functions when users table is missing
- [x] Ensure `_genHelperFunctions` properly detects missing functions from report

### Step 4: `src/setup-wizard/SetupWizard.jsx`
- [x] Remove `execSqlFn` prepending — let SqlGenerator handle it consistently
- [x] Remove unused `buildExecSqlFunction` import
- [x] Call `generateFullSchema()` when report has no missing objects

### Step 5: `generate-sql.sql`
- [x] Verify it already has all required objects (check_admin_exists, is_admin_user, all 5 RLS policies)

### Step 6: Verification
- [x] All code changes complete — files are ready for runtime verification
- [ ] Run the app and verify both outputs produce identical SQL on fresh database
- [ ] After SQL execution, verify installation passes with 0 missing objects
- [ ] Test registration flow creates profile record successfully
