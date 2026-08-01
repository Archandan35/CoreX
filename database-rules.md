# Database Schema Consistency Rules

When I say **"run database-rule"**, verify every checkpoint below. Every database object must exist in ALL 4 source files:

| # | File | Role |
|---|---|---|
| 1 | `generate-sql.sql` | Canonical master SQL installation script |
| 2 | `src/schema/models/index.js` | SCHEMAS object — JS source of truth for models |
| 3 | `src/setup-wizard/SqlGenerator.js` | Dynamic SQL generator (mirrors SQL at runtime) |
| 4 | `src/setup-wizard/DatabaseValidator.js` | Live DB inspection method for each object |

**Current status: All gaps fixed. See fix log below.**

---

## 1. No Assumptions in Validation Code

Every database object must be individually verified. No "if X exists then assume Y exists" fallbacks.

- [ ] `DatabaseValidator._checkTriggers()` — no fallback that assumes trigger exists based on `exec_sql` + tables *(FIXED)*
- [ ] `DatabaseValidator._checkVersion()` — no assumption that version matches when `_schema_version` is empty
- [ ] Any `.some()` / fallback logic in validators must directly check the target object, not infer from others

**Forbidden patterns:**
```js
// ❌ BAD — assumes Y exists because X exists
// ❌ BAD — empty result treated as "present"
// ✅ GOOD — explicitly check each object
```

---

## 2. Complete Object Inventory

Every object below must be present in ALL 4 files. Use this as the master checklist.

### 2.1 Tables (28 total)

| # | Table | SQL (CREATE TABLE) | SCHEMAS (`table:` field) | SqlGenerator (`_genTable` / `_genAllTables`) | Validator (`_validateEntity`) |
|---|---|---|---|---|---|---|
| 1 | `users` | ✓ | ✓ | ✓ | ✓ |
| 2 | `roles` | ✓ | ✓ | ✓ | ✓ |
| 3 | `settings` | ✓ | ✓ | ✓ | ✓ |
| 4 | `customers` | ✓ | ✓ | ✓ | ✓ |
| 5 | `product_categories` | ✓ | ✓ | ✓ | ✓ |
| 6 | `product_brands` | ✓ | ✓ | ✓ | ✓ |
| 7 | `product_units` | ✓ | ✓ | ✓ | ✓ |
| 8 | `product_warehouses` | ✓ | ✓ | ✓ | ✓ |
| 9 | `product_tax_rates` | ✓ | ✓ | ✓ | ✓ |
| 10 | `product_item_groups` | ✓ | ✓ | ✓ | ✓ |
| 11 | `product_manufacturers` | ✓ | ✓ | ✓ | ✓ |
| 12 | `products` | ✓ | ✓ | ✓ | ✓ |
| 13 | `banks` | ✓ | ✓ | ✓ | ✓ |
| 14 | `signatures` | ✓ | ✓ | ✓ | ✓ |
| 15 | `invoices` | ✓ | ✓ | ✓ | ✓ |
| 16 | `invoice_items` | ✓ | ✓ | ✓ | ✓ |
| 17 | `invoice_payments` | ✓ | ✓ | ✓ | ✓ |
| 18 | `audit_logs` | ✓ | ✓ | ✓ | ✓ |
| 19 | `accounting_entries` | ✓ | ✓ | ✓ | ✓ |
| 20 | `document_prefixes` | ✓ | ✓ | ✓ | ✓ |
| 21 | `document_suffixes` | ✓ | ✓ | ✓ | ✓ |
| 22 | `custom_headers` | ✓ | ✓ | ✓ | ✓ |
| 23 | `document_notes` | ✓ | ✓ | ✓ | ✓ |
| 24 | `document_terms` | ✓ | ✓ | ✓ | ✓ |
| 25 | `invoice_table_columns` | ✓ | ✓ | ✓ | ✓ |
| 26 | `document_settings` | ✓ | ✓ | ✓ | ✓ |
| 27 | `document_type_master` | ✓ | ✓ | ✓ | ✓ |
| 28 | `_schema_version` | ✓ | ✓ *(FIXED)* | ✓ (via `_genVersion`) | ✓ (via `_validateEntity` + `_checkVersion`) |

### 2.2 Columns per Table

For each table above, EVERY column must have matching: name, type, nullable, default, and PK in all 4 files.

- [ ] All column names match between SQL → SCHEMAS.columns → SqlGenerator → Validator
- [ ] All column types match (UUID, TEXT, BOOLEAN, NUMERIC, DATE, TIMESTAMPTZ, JSONB, TEXT[], INTEGER)
- [ ] All nullable rules match (NOT NULL vs nullable)
- [ ] All default values match
- [ ] Primary key columns match

### 2.3 Constraints

#### PRIMARY KEY

| Table | PK Column(s) | SQL | SCHEMAS (`primaryKey`) | SqlGenerator | Validator (`_checkConstraints`) |
|---|---|---|---|---|---|
| users | id | ✓ | ✓ | ✓ | ✓ |
| roles | id | ✓ | ✓ | ✓ | ✓ |
| settings | key | ✓ | ✓ | ✓ | ✓ |
| customers | id | ✓ | ✓ | ✓ | ✓ |
| product_categories | id | ✓ | ✓ | ✓ | ✓ |
| products | id | ✓ | ✓ | ✓ | ✓ |
| banks | id | ✓ | ✓ | ✓ | ✓ |
| signatures | id | ✓ | ✓ | ✓ | ✓ |
| invoices | id | ✓ | ✓ | ✓ | ✓ |
| invoice_items | id | ✓ | ✓ | ✓ | ✓ |
| invoice_payments | id | ✓ | ✓ | ✓ | ✓ |
| audit_logs | id | ✓ | ✓ | ✓ | ✓ |
| accounting_entries | id | ✓ | ✓ | ✓ | ✓ |
| document_prefixes | id | ✓ | ✓ | ✓ | ✓ |
| document_suffixes | id | ✓ | ✓ | ✓ | ✓ |
| custom_headers | id | ✓ | ✓ | ✓ | ✓ |
| document_notes | id | ✓ | ✓ | ✓ | ✓ |
| document_terms | id | ✓ | ✓ | ✓ | ✓ |
| invoice_table_columns | id | ✓ | ✓ | ✓ | ✓ |
| document_settings | id | ✓ | ✓ | ✓ | ✓ |
| document_type_master | id | ✓ | ✓ | ✓ | ✓ |
| _schema_version | (version, applied_at)* | ✓ | ✓ | ✓ (via `_genVersion`) | ✓ |

#### UNIQUE

| Table | Columns | SQL | SCHEMAS (`unique:{}`) | SqlGenerator | Validator (`_checkConstraints`) |
|---|---|---|---|---|---|
| users | email | ✓ (inline UNIQUE) | ✓ | ✓ | ✓ |
| users | username | ✓ (inline UNIQUE) | ✓ | ✓ | ✓ |
| roles | name | ✓ (inline UNIQUE) | ✓ | ✓ | ✓ |
| invoices | invoice_number | ✓ (inline UNIQUE) | ✓ | ✓ | ✓ |
| document_type_master | name | ✓ (inline UNIQUE) | ✓ | ✓ | ✓ |

\* SQL has composite PK `(version, applied_at)`. SCHEMAS uses `primaryKey: 'version'` (simplified — `_checkConstraints` only verifies that ANY PK exists, not which columns).

#### FOREIGN KEY

- [ ] **Missing entirely** — No `REFERENCES` constraints anywhere in any of the 4 files
- [ ] Columns like `created_by`, `customer_id`, `category_id`, `bank_id`, `signature_id`, `invoice_id`, `product_id` are UUID references but have no formal FK constraints
- [ ] If the application requires referential integrity, FKs must be added to SQL + SqlGenerator and validated by Validator

#### CHECK

- [ ] **Missing entirely** — No CHECK constraints in any of the 4 files

### 2.4 Indexes (51 total)

Each index defined in `generate-sql.sql` must be:
- Defined in SCHEMAS (via `searchableFields[]` or `indexes[]`)
- Generated by SqlGenerator
- Checked by Validator (`_checkIndexes`)

| # | Index | SQL | SCHEMAS source | SqlGen | Validator | Validator gap? |
|---|---|---|---|---|---|---|
| 1 | `idx_users_name` | ✓ | `searchableFields` | ✓ | ✓ | |
| 2 | `idx_users_username` | ✓ | `searchableFields` | ✓ | ✓ | |
| 3 | `idx_users_email` | ✓ | `searchableFields` | ✓ | ✓ | |
| 4 | `idx_users_phone` | ✓ | `searchableFields` | ✓ | ✓ | |
| 5 | `idx_customers_name` | ✓ | `searchableFields` | ✓ | ✓ | |
| 6 | `idx_customers_company` | ✓ | `searchableFields` | ✓ | ✓ | |
| 7 | `idx_customers_email` | ✓ | `searchableFields` | ✓ | ✓ | |
| 8 | `idx_customers_phone` | ✓ | `searchableFields` | ✓ | ✓ | |
| 9 | `idx_customers_gstin` | ✓ | `searchableFields` | ✓ | ✓ | |
| 10 | `idx_customers_created_by` | ✓ | `indexes` | ✓ | ✓ | *(FIXED)* |
| 11 | `idx_product_categories_name` | ✓ | `searchableFields` | ✓ | ✓ | |
| 12 | `idx_products_name` | ✓ | `searchableFields` | ✓ | ✓ | |
| 13 | `idx_products_sku` | ✓ | `searchableFields` | ✓ | ✓ | |
| 14 | `idx_products_barcode` | ✓ | `searchableFields` | ✓ | ✓ | |
| 15 | `idx_products_hsn_code` | ✓ | `searchableFields` | ✓ | ✓ | |
| 16 | `idx_products_created_by` | ✓ | `indexes` | ✓ | ✓ | *(FIXED)* |
| 17 | `idx_banks_bank_name` | ✓ | `searchableFields` | ✓ | ✓ | |
| 18 | `idx_banks_account_name` | ✓ | `searchableFields` | ✓ | ✓ | |
| 19 | `idx_banks_account_number` | ✓ | `searchableFields` | ✓ | ✓ | |
| 20 | `idx_banks_ifsc` | ✓ | `searchableFields` | ✓ | ✓ | |
| 21 | `idx_banks_upi_id` | ✓ | `searchableFields` | ✓ | ✓ | |
| 22 | `idx_signatures_label` | ✓ | `searchableFields` | ✓ | ✓ | |
| 23 | `idx_signatures_signer_name` | ✓ | `searchableFields` | ✓ | ✓ | |
| 24 | `idx_invoices_invoice_number` | ✓ | `searchableFields` | ✓ | ✓ | |
| 25 | `idx_invoices_reference` | ✓ | `searchableFields` | ✓ | ✓ | |
| 26 | `idx_invoices_customer_id` | ✓ | `indexes` | ✓ | ✓ | *(FIXED)* |
| 27 | `idx_invoices_created_by` | ✓ | `indexes` | ✓ | ✓ | *(FIXED)* |
| 28 | `idx_invoices_status` | ✓ | `indexes` | ✓ | ✓ | *(FIXED)* |
| 29 | `idx_invoice_items_name` | ✓ | `searchableFields` | ✓ | ✓ | |
| 30 | `idx_invoice_items_invoice_id` | ✓ | `indexes` | ✓ | ✓ | *(FIXED)* |
| 31 | `idx_invoice_payments_note` | ✓ | `searchableFields` | ✓ | ✓ | |
| 32 | `idx_invoice_payments_invoice_id` | ✓ | `indexes` | ✓ | ✓ | *(FIXED)* |
| 33 | `idx_audit_logs_table_name` | ✓ | `indexes` | ✓ | ✓ | *(FIXED — was composite, now single-column)* |
| 34 | `idx_audit_logs_record_id` | ✓ | `indexes` | ✓ | ✓ | *(FIXED — was composite, now single-column)* |
| 35 | `idx_audit_logs_created_at` | ✓ | `indexes` | ✓ | ✓ | *(FIXED)* |
| 36 | `idx_accounting_entries_invoice` | ✓ | `indexes` | ✓ | ✓ | *(FIXED)* |
| 37 | `idx_document_prefixes_doc_type` | ✓ | `searchableFields` | ✓ | ✓ | |
| 38 | `idx_document_suffixes_doc_type` | ✓ | `searchableFields` | ✓ | ✓ | |
| 39 | `idx_custom_headers_active` | ✓ | `indexes` | ✓ | ✓ | |
| 40 | `idx_custom_headers_display_order` | ✓ | `indexes` | ✓ | ✓ | |
| 41 | `idx_document_notes_doc_type` | ✓ | `searchableFields` | ✓ | ✓ | |
| 42 | `idx_document_terms_doc_type` | ✓ | `searchableFields` | ✓ | ✓ | |
| 43 | `idx_invoice_table_columns_display_order` | ✓ | `indexes` | ✓ | ✓ | |
| 44 | `idx_document_type_master_name` | ✓ | `searchableFields` | ✓ | ✓ | |

### 2.5 Functions (4 total)

| # | Function | SQL | SCHEMAS (`type:'function'`) | SqlGenerator | Validator (`REQUIRED_FUNCTIONS` or `_checkRequiredFunctions`) |
|---|---|---|---|---|---|
| 1 | `exec_sql` | ✓ | ✓ | ✓ | ✓ |
| 2 | `check_admin_exists` | ✓ | ✓ | ✓ | ✓ |
| 3 | `is_admin_user` | ✓ | ✓ | ✓ | ✓ |
| 4 | `handle_new_user` | ✓ | ✓ (embedded in trigger code) | ✓ (in `_genUserTrigger`) | ✓ *(FIXED — added to `REQUIRED_FUNCTIONS`)* |

### 2.6 Triggers (1 total)

| # | Trigger | SQL | SCHEMAS | SqlGenerator | Validator |
|---|---|---|---|---|---|
| 1 | `on_auth_user_created` (AFTER INSERT ON auth.users) | ✓ | ✓ (`requiredTriggers` metadata) | ✓ | ✓ (reads from `schema.requiredTriggers`) |

### 2.7 RLS Policies (89 total)

- [ ] All RLS-enabled tables have policies generated in SQL and SqlGenerator
- [ ] SCHEMAS entities with RLS have `rls: true` or `rls: false` explicitly (no undefined)
- [x] **`roles` and `settings` added `rls: false`** *(FIXED)*
- [x] **`document_type_master` added `rls: false`** *(FIXED — shared seed table read by browser client)*
- [x] **`_checkPolicies` now verifies each RLS-enabled table has at least one policy** *(FIXED)*

**Expected policy count by table (owner = `public.is_admin_user() OR created_by = auth.uid()`):**
| Table | Policies | SQL | SqlGenerator |
|---|---|---|---|
| users | 5 (own select, admin select, auth insert, own update, admin update) | ✓ | ✓ |
| customers | 4 (owner R/W/U/D) | ✓ | ✓ |
| product_categories | 4 (owner R/W/U/D) | ✓ | ✓ |
| products | 4 (owner R/W/U/D) | ✓ | ✓ |
| product_brands | 4 (owner R/W/U/D) | ✓ | ✓ |
| product_units | 4 (owner R/W/U/D) | ✓ | ✓ |
| product_warehouses | 4 (owner R/W/U/D) | ✓ | ✓ |
| product_tax_rates | 4 (owner R/W/U/D) | ✓ | ✓ |
| product_item_groups | 4 (owner R/W/U/D) | ✓ | ✓ |
| product_manufacturers | 4 (owner R/W/U/D) | ✓ | ✓ |
| banks | 4 (owner R/W/U/D) | ✓ | ✓ |
| signatures | 4 (owner R/W/U/D) | ✓ | ✓ |
| invoices | 4 (owner R/W/U/D) | ✓ | ✓ |
| invoice_items | 4 (owner subquery R/W/U/D) | ✓ | ✓ |
| invoice_payments | 4 (owner subquery R/W/U/D) | ✓ | ✓ |
| document_prefixes | 4 (owner R/W/U/D) | ✓ | ✓ |
| document_suffixes | 4 (owner R/W/U/D) | ✓ | ✓ |
| custom_headers | 4 (owner R/W/U/D) | ✓ | ✓ |
| document_notes | 4 (owner R/W/U/D) | ✓ | ✓ |
| document_terms | 4 (owner R/W/U/D) | ✓ | ✓ |
| invoice_table_columns | 4 (owner R/W/U/D) | ✓ | ✓ |
| document_settings | 4 (owner R/W/U/D) | ✓ | ✓ |
| audit_logs | 0 (RLS disabled) | ✓ | ✓ |
| accounting_entries | 0 (RLS disabled) | ✓ | ✓ |
| roles | 0 (RLS disabled) | ✓ | ✓ |
| settings | 0 (RLS disabled) | ✓ | ✓ |
| document_type_master | 0 (RLS disabled) | ✓ | ✓ |

### 2.8 GRANT Permissions (3 total)

| # | Grant | SQL | SCHEMAS | SqlGenerator | Validator |
|---|---|---|---|---|---|
| 1 | `GRANT EXECUTE ON FUNCTION exec_sql(text) TO anon, authenticated, service_role` | ✓ | ✓ (`functionGrants`) | ✓ | ✓ (`_checkGrants` via `has_function_privilege`) |
| 2 | `GRANT EXECUTE ON FUNCTION check_admin_exists() TO anon, authenticated, service_role` | ✓ | ✓ (`functionGrants`) | ✓ | ✓ |
| 3 | `GRANT EXECUTE ON FUNCTION is_admin_user() TO anon, authenticated, service_role` | ✓ | ✓ (`functionGrants`) | ✓ | ✓ |

### 2.9 Schema Version

| Aspect | SQL | SCHEMAS | SqlGenerator | Validator |
|---|---|---|---|---|
| `_schema_version` table | ✓ (L540-545) | ✓ *(FIXED)* | ✓ (`_genVersion`) | ✓ (`_checkVersion` + `_validateEntity`) |
| Version number (5) | ✓ | `version = 5` (stays 5 despite new tables — schema content is repaired in place) | Uses schema.version | Uses schema.version |
| Version INSERT description | `"Schema v5: user_role_refactor ..."` | N/A | `"Schema installation via Setup Wizard"` *(generic)* | N/A |

### 2.10 Extensions

- [ ] `SCHEMAS.extensions` matches `generate-sql.sql` (currently both empty — no extensions required)
- [ ] SqlGenerator generates CREATE EXTENSION for any entry in the array
- [ ] Validator `_checkExtensions` checks each entry exists

### 2.11 Seed Data

- [ ] `SCHEMAS.seedData` matches seed INSERTs in `generate-sql.sql` — `document_type_master` has 11 rows (IDs `e15c7e40-9b2a-4f6a-9d1e-000000000001` … `...011`)
- [ ] SqlGenerator generates seed INSERTs for any entry
- [ ] Validator `_checkSeeds` counts rows against `minCount`

---

## 3. SqlGenerator ↔ generate-sql.sql Parity

- [ ] Every table DDL matches (columns, types, defaults, nullability)
- [ ] Every constraint (PK, UNIQUE) matches
- [ ] Every index DDL matches
- [ ] Every function DDL matches
- [ ] Every trigger DDL matches
- [ ] All RLS enable/disable + policy DDL matches
- [ ] Version number + INSERT matches
- [x] **`audit_logs` indexes aligned** — SQL now uses single-column indexes matching SCHEMAS *(FIXED)*
- [ ] **Version description** — SQL has meaningful text, SqlGenerator uses generic text

---

## 4. Both Health Check Functions ↔ Validator Parity

- [ ] Same tables checked — the Supabase health check now diffs **ALL** SCHEMAS tables/columns via `getSchemaGap()` (not just the 4 core tables), plus trigger/function/policy probes
- [ ] Same trigger check (`on_auth_user_created`)
- [ ] Same function checks (`exec_sql`, `check_admin_exists`, `is_admin_user`, `handle_new_user`)
- [ ] Same RLS policy check (policies exist in `public`)
- [ ] Same version check (forward-compatible logic)
- [ ] No additional assumptions in either path

---

## 6a. Auto-Repair (Self-Healing Schema)

The app no longer lets a degraded database fail silently at runtime. Flow in `src/schema/repair.js` + `src/App.jsx` (`initApp`):

1. **Detect** — startup health check diffs the live DB against SCHEMAS (`getSchemaGap`). A table/column added to SCHEMAS but missing in the DB flags the database `everInstalled && !compatible`.
2. **Repair** — `autoRepairSchema()` runs `DatabaseValidator` → `SqlGenerator.generate({ missing })` → splits SQL → executes each idempotent statement via `exec_sql` → `NOTIFY pgrst, 'reload schema'` → re-validates.
3. **Fallback** — if repair can't run (e.g. `exec_sql` itself missing) or fails, the `DatabaseHealthBanner` + Setup Wizard still work as before.

**Consequences for adding a new feature:**
- After adding the new table to all 4 source files (rule §1), reload the app — the missing table is created automatically on the next startup. No manual SQL Editor run, no PGRST205.
- Repair is idempotent (`IF NOT EXISTS` / `EXCEPTION WHEN duplicate_object`), so it's safe on healthy DBs and safe to retry.
- The old silent behavior ("just show empty list / raw schema-cache error") is replaced with a friendly message in `describeSchemaError` (`src/utils/dbErrors.js`).

### 6a.1 How can the browser create database tables?

The browser can't normally run DDL — but the app has one privileged helper that makes it possible:

- `exec_sql(text)` is a **SECURITY DEFINER** function installed by the Setup Wizard (`buildExecSqlFunction` in `src/schema/models/index.js`). SECURITY DEFINER means it executes **as the database owner** (bypasses RLS and normal permissions) even though the browser calls it via `supabase.rpc('exec_sql', ...)`.
- It was **`GRANT EXECUTE ... TO anon, authenticated, service_role`** so the app is allowed to call it over the REST API. This is the same door the Setup Wizard already used to install the whole schema — auto-repair reuses it, it is not a new backdoor.
- Auto-repair only ever feeds it **idempotent DDL generated by the app itself** from SCHEMAS (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DO $$ ... EXCEPTION WHEN duplicate_object`), never free-form user input — so re-running is a no-op and a failed repair is safe to retry.
- After the DDL runs, `NOTIFY pgrst, 'reload schema'` forces PostgREST to drop its stale schema cache, so the new table is addressable on the very next request (this is the step that stops a fresh PGRST205). Supabase additionally auto-notifies on DDL via its own event trigger.

**Security caveat (pre-existing, not introduced by auto-repair):** because the grant is to `anon`, anyone with the public anon key can also call `exec_sql` and run SQL as the owner. That tradeoff is required for the Setup Wizard to install the schema from the browser. Mitigations that are safe to add later: revoke `anon` and rely on `authenticated` + server-side `service_role` for installation, or restrict `exec_sql` to a stricter allow-list.

### 6a.2 When auto-repair runs

- Runs **only** when `everInstalled === true` and the DB is incompatible (health check failed).
- A **never-installed** (fresh) DB skips repair and goes straight to the Setup Wizard — no DDL runs automatically on an empty database.
- A **fully compatible** DB skips repair entirely (no-op), so healthy startups pay only the cost of the 2 `getSchemaGap` queries in the existing thorough check.
- On success it re-checks health and proceeds; on failure it falls back to the `DatabaseHealthBanner` + Setup Wizard exactly as before.



## 5. Cross-File Version Consistency

- [ ] `SCHEMAS.version` matches version in `generate-sql.sql` header comment and `INSERT`
- [ ] `SqlGenerator.js` version output matches
- [ ] `DatabaseValidator._checkVersion()` uses `schema.version`
- [ ] `getSupabaseSchemaHealth` / `getRawDbSchemaHealth` use `SCHEMAS.version`
- [ ] Forward-compatible: older DB version + all objects present = compatible

---

## 6. Startup Decision Flow (data-flow.md)

- [ ] `initApp()` uses `everInstalled` to decide: banner vs wizard
- [ ] `handleSetupComplete()` uses `everInstalled` — does NOT force wizard for previously-installed DBs
- [ ] `DatabaseHealthBanner` only shows for `full_access = true` users
- [ ] `AdminSetupBanner` shows when no admin exists
- [ ] Fresh install (never installed) → auto-open wizard
- [ ] Previously installed, now degraded → banner (not wizard)
- [ ] Fully compatible → skip wizard + banner, proceed to auth

---

## 7. Fix Log

| Date | Fix | Files Changed |
|---|---|---|
| v2 | Removed `exec_sql`+tables fallback from `_checkTriggers` | `DatabaseValidator.js` |
| v2 | `_checkIndexes` now validates both `searchableFields` + `indexes` arrays | `DatabaseValidator.js` |
| v2 | Added `handle_new_user` to `REQUIRED_FUNCTIONS` | `DatabaseValidator.js` |
| v2 | Split composite `idx_audit_logs_table_record` into 2 single-column indexes | `generate-sql.sql` |
| v2 | Added explicit `rls: false` to `roles` and `settings` | `src/schema/models/index.js` |
| v2 | Added `requiredTriggers` metadata + `_checkTriggers` reads from it | `src/schema/models/index.js`, `DatabaseValidator.js` |
| v2 | Added `functionGrants` metadata + `_checkGrants` method | `src/schema/models/index.js`, `DatabaseValidator.js` |
| v2 | `_checkPolicies` now verifies each RLS-enabled table has ≥1 policy | `DatabaseValidator.js` |
| v2 | Added `_schema_version` table entry to SCHEMAS | `src/schema/models/index.js` |
| v2 | `SqlGenerator._genAllTables/_genMissingTables/_genMissingColumns` skip `_schema_version` (handled by `_genVersion`) | `SqlGenerator.js` |
| v3 | Added `handle_new_user` to Supabase health check in `getSupabaseSchemaHealth` (was only checking 3 of 4 required functions) | `App.jsx` |
| v9 | Added 8 tables to all 4 schema sources: `document_prefixes`, `document_suffixes`, `custom_headers`, `document_notes`, `document_terms`, `invoice_table_columns`, `document_settings`, `document_type_master` — refactor of JSON-blob `settings` keys (`_prefix_settings`, `_suffix_settings`, `_custom_headers`, `_document_notes`, `_document_terms`, `_product_columns`, `documentSettings`) into relational tables | `src/schema/models/index.js`, `generate-sql.sql`, `src/schema/migrations/index.js` (v9), `server/api.js`, 5 services |
| v9 | `document_type_master` set `rls: false` (shared seed table read by browser client); added 11-row `SCHEMAS.seedData` + seed INSERT (migration v9 + generate-sql.sql) | `src/schema/models/index.js`, `generate-sql.sql`, `src/schema/migrations/index.js` |
| v9 | Rewrote Supabase handlers in `server/api.js` to use real tables (prefix/suffix/notes/terms/product-columns) with `*ToRow`/`*ToApi` mappers; `is_default` kept unique per `doc_type` | `server/api.js` |
| v9 | Rewrote 5 browser services to query new tables preserving method names/`filterPage` shapes: `PrefixService`, `SuffixService`, `CustomHeaderService`, `DocumentNoteService`, `SettingsService` | `src/services/invoice/services/*.js` |

### Design decisions (not bugs)

| Item | Rationale |
|---|---|
| No FOREIGN KEY constraints | App uses logical FKs (UUID columns); performance + flexibility over referential enforcement |
| No CHECK constraints | Not required by current app logic; can be added when business rules demand |

---

## 8. Quick Reference: Key Files

| File | Purpose |
|---|---|
| `generate-sql.sql` | Canonical master SQL installation script |
| `src/schema/models/index.js` | SCHEMAS — JS source of truth for all DB objects |
| `src/setup-wizard/SqlGenerator.js` | Dynamic SQL generator (mirrors SQL) |
| `src/setup-wizard/DatabaseValidator.js` | Live DB inspection against SCHEMAS |
| `src/setup-wizard/SchemaAnalyzer.js` | Builds analysis + plan from validator report |
| `src/App.jsx` (lines 83-252) | Startup health checks + decision logic |
| `src/components/layout/DatabaseHealthBanner.jsx` | Degraded DB banner |
| `src/components/layout/AdminSetupBanner.jsx` | No-admin banner |




How your database is formed
Your app has 4 files that must always agree. Think of them as 4 people building the same house:
generate-sql.sql     ─── The BLUEPRINT (the master copy, written in SQL)
SCHEMAS (index.js)   ─── The PARTS LIST (all objects listed in JS)
SqlGenerator.js      ─── The BUILDER (reads the parts list and builds SQL at runtime)
DatabaseValidator.js ─── The INSPECTOR (checks if the real DB matches the parts list)

When the Setup Wizard runs:
1. Step 5 (Analysis): The Inspector (DatabaseValidator) checks the real database against the Parts List (SCHEMAS). Reports what's missing.
2. Step 7 (Generate SQL): The Builder (SqlGenerator) reads the Parts List and builds SQL to create missing objects.
3. The Blueprint (generate-sql.sql) is your static backup — the same SQL, hand-written, for manual installs.

The Rule: Every object must exist in ALL 4 files

How to keep it perfect forever

1. Always add to ALL 4 files simultaneously
When you add a new database object:
Object	Blueprint (sql)	Parts List (SCHEMAS)
New table	Add CREATE TABLE	Add { table: '...', columns: [...], ... }
New column	Add to CREATE TABLE	Add to columns: [] + columnTypes: {}
New index	Add CREATE INDEX	Add to searchableFields[] or indexes[]
New function	Add CREATE FUNCTION	Add { type: 'function', build: ... }
New trigger	Add CREATE TRIGGER	Add to requiredTriggers[] array
New RLS policy	Add CREATE POLICY	Already handled by rls: true
GRANT permission	Add GRANT ... TO ...	Add to functionGrants[] array

2. No shortcuts, no assumptions
The Inspector must directly check every object. Never do:
if (exec_sql exists AND any table exists) → assume trigger exists  ← BAD
Do:
SELECT from pg_trigger WHERE name = 'on_auth_user_created'  ← GOOD

3. Run "run database-rule" after every schema change
When you say this, I check every checkpoint in database-rules.md — every table, column, index, function, trigger, policy, grant — across all 4 files. If any object is missing from any file, I flag it before you get a false analysis report.

4. The golden rule
If you only change one file, you've created a bug. Always change all 4. Or better: change SCHEMAS first (the Parts List), then run the Setup Wizard — the Builder and Inspector automatically read from it. Update the Blueprint (generate-sql.sql) to match, and you're done.