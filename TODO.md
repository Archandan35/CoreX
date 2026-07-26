# SQL Generation Pipeline Fixes — COMPLETED

## Root Causes & Fixes

### Fix 1: Add `generateFullSchema()` method to SqlGenerator
- [x] Added `generateFullSchema()` method that delegates to `this.generate(null, { full: true })`
- File: `src/setup-wizard/SqlGenerator.js`

### Fix 2: Fix `handleGenerateSql` in SetupWizard.jsx
- [x] Imported `buildExecSqlFunction` from `../schema/models/index.js`
- [x] Replaced undefined `execSqlFn` with `buildExecSqlFunction()`
- [x] Replaced `generator.generateFullSchema()` with proper call (now exists on SqlGenerator)
- [x] Fixed broken `useEffect` that was missing its closing bracket and had orphaned code
- [x] Properly defined `handleGenerateSql` as a `useCallback`
- File: `src/setup-wizard/SetupWizard.jsx`

### Fix 3: Refactor `SqlGenerator` to include `is_admin_user` in helper functions
- [x] Changed `_genHelperFunctions(missing, full)` to `_genHelperFunctions(report, full)` to access full report
- [x] Added `is_admin_user` generation to `_genHelperFunctions()` for full mode
- [x] In `_genRLS()`, removed duplicate `is_admin_user` function (now only in Helper Functions section)
- [x] Consistent structure: both full and delta modes emit `is_admin_user` in Helper Functions section
- File: `src/setup-wizard/SqlGenerator.js`

### Fix 4: Update `generate-sql.sql` with missing "Admins can update all users" policy
- [x] Added the 5th RLS policy for admin update capability
- File: `generate-sql.sql`

### Fix 5: Add architectural guard to prevent future drift
- [x] Added canonical source header to `generate-sql.sql`
- [x] `generateFullSchema()` is now the single code path for full schema output
- [x] `SqlGenerator.generate()` with `{ full: true }` is the single source of truth
- File: `generate-sql.sql`, `src/setup-wizard/SqlGenerator.js`
