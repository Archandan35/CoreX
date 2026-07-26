# SQL Generation Pipeline Refactoring

## Progress Tracker

### Step 1: Model all SQL objects in schema definition
- [✅] Add `exec_sql` function model
- [✅] Add `check_admin_exists` function model  
- [✅] Add `is_admin_user` function model (already partially done)

### Step 2: Refactor SqlGenerator.js
- [✅] Add `_genExecSql()` method (via schema.build)
- [✅] Add `_genCheckAdminExists()` method (via schema.build)
- [✅] Merge `generate()` and `generateFullSchema()` into single `generate(report, options)` method
- [✅] When `options.full = true`, emit everything from schema definition
- [✅] When `options.full = false`, emit only delta from report
- [✅] Ensure trigger is included conditionally based on report (not unconditionally)
- [✅] Add `check_admin_exists` to output
- [✅] Include comments for admin helper functions before RLS policies

### Step 3: Refactor SetupWizard.jsx
- [ ] Remove raw `execSqlFn` string constant
- [ ] `handleGenerateSql()` uses `generate(report, { full: true })` for complete schema (download)
- [ ] Preview uses `generate(report, { full: false })` for delta

### Step 4: Eliminate static generate-sql.sql
- [ ] Remove static `generate-sql.sql` file
- [ ] Create a build-time script that generates it from `SqlGenerator`

### Step 5: Fix fresh-database detection path
- [ ] Auto-detect when all objects are missing → use full schema mode
