# Database Schema Consistency Rules

When I say **"run database-rule"**, verify every checkpoint below.

---

## 1. No Assumptions in Validation Code

**Rule**: Every database object must be individually verified. No "if X exists then assume Y exists" fallbacks.

- [ ] `DatabaseValidator._checkTriggers()` — no fallback that assumes trigger exists based on `exec_sql` + tables
- [ ] `DatabaseValidator._checkVersion()` — no assumption that version matches when `_schema_version` is empty
- [ ] Any `.some()` / fallback logic in validators must directly check the target object, not infer from others

## 2. SCHEMAS ↔ generate-sql.sql Parity

**Rule**: Every object in `generate-sql.sql` must have a corresponding entry in `src/schema/models/index.js` (SCHEMAS).

| Object type | SQL location | SCHEMAS check |
|---|---|---|
| Tables | Each `CREATE TABLE` line | Each SCHEMAS entry with `table:` field |
| Columns | Column definitions inside each `CREATE TABLE` | `columns:` array in matching SCHEMAS entry |
| Functions | `CREATE OR REPLACE FUNCTION` | SCHEMAS entry with `type: 'function'` or in `REQUIRED_FUNCTIONS` list |
| Triggers | `CREATE TRIGGER` | Must be checked in `DatabaseValidator._checkTriggers()` |
| Indexes | `CREATE INDEX` under `===== Indexes =====` | `searchableFields` or `indexes` in SCHEMAS entry |
| RLS policies | `CREATE POLICY` under `===== Row Level Security =====` | `rls: true` on matching SCHEMAS entry |
| Schema version | `INSERT INTO _schema_version` | `SCHEMAS.version` number |
| Extensions | Any `CREATE EXTENSION` | `SCHEMAS.extensions` array |
| Seed data | Any seed `INSERT` statements | `SCHEMAS.seedData` array |
| Composite key tables | `_schema_version` with composite PK | Individual SCHEMAS entry |

## 3. SqlGenerator ↔ generate-sql.sql Parity

**Rule**: `src/setup-wizard/SqlGenerator.js` must emit the same SQL as `generate-sql.sql` for every entity.

- [ ] Every table DDL matches
- [ ] Every column + type + default + nullable matches
- [ ] Every constraint (PK, UNIQUE) matches
- [ ] Every index DDL matches
- [ ] Every function DDL matches
- [ ] Every trigger DDL matches
- [ ] All RLS enable/disable + policy DDL matches
- [ ] `_schema_version` INSERT matches
- [ ] Seed data INSERTs match
- [ ] Extension CREATE matches
- [ ] Version number matches

## 4. Both Health Check Functions ↔ Validator Parity

**Rule**: `getSupabaseSchemaHealth` and `getRawDbSchemaHealth` (in `App.jsx`) must check the same set of things as `DatabaseValidator.validateAll()`.

- [ ] Same 4 tables checked (`users`, `roles`, `settings`, `_schema_version`)
- [ ] Same trigger check (`on_auth_user_created`)
- [ ] Same function checks (`exec_sql`, `check_admin_exists`, `is_admin_user`)
- [ ] Same RLS policy check (policies exist in `public`)
- [ ] Same version check logic
- [ ] No additional assumptions in either path

## 5. Anti-Assumption Validation Patterns

**Forbidden patterns** in all validation code:

```js
// ❌ BAD — assumes Y exists because X exists
if (xExists) assumeYExists = true;

// ❌ BAD — empty result treated as "present"
if (!error) assumeExists = true;

// ✅ GOOD — explicitly check each object
const yExists = await checkYExists();

// ✅ GOOD — verify, don't assume
if (!error && data && data.length > 0) exists = true;
```

## 6. Cross-File Version Consistency

- [ ] `SCHEMAS.version` in `src/schema/models/index.js` matches the version in `generate-sql.sql` header comment and `INSERT`
- [ ] `SqlGenerator.js` version output matches
- [ ] `DatabaseValidator._checkVersion()` uses `schema.version` from SCHEMAS
- [ ] `getSupabaseSchemaHealth` / `getRawDbSchemaHealth` use `SCHEMAS.version`
- [ ] Health checks are forward-compatible (older DB version + all objects present = compatible)

## 7. Startup Decision Flow (data-flow.md compliance)

- [ ] `initApp()` uses `everInstalled` to decide: banner vs wizard
- [ ] `handleSetupComplete()` uses `everInstalled` — does NOT force wizard for previously-installed DBs
- [ ] `DatabaseHealthBanner` only shows for `full_access = true` users
- [ ] `AdminSetupBanner` shows when no admin exists
- [ ] Fresh install (never installed) → auto-open wizard
- [ ] Previously installed, now degraded → banner (not wizard)
- [ ] Fully compatible → skip wizard + banner, proceed to auth

---

## Quick Reference: Key Files

| File | Purpose |
|---|---|
| `src/schema/models/index.js` | SCHEMAS object — JS source of truth |
| `generate-sql.sql` | Canonical master SQL installation script |
| `src/setup-wizard/SqlGenerator.js` | Dynamic SQL generator (mirrors SQL) |
| `src/setup-wizard/DatabaseValidator.js` | Live DB inspection against SCHEMAS |
| `src/setup-wizard/SchemaAnalyzer.js` | Builds analysis + plan from validator report |
| `src/App.jsx` (lines 83-252) | Startup health checks + decision logic |
| `src/components/layout/DatabaseHealthBanner.jsx` | Degraded DB banner |
| `src/components/layout/AdminSetupBanner.jsx` | No-admin banner |
