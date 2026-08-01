// Auto-repair module.
//
// When a database was installed successfully but has since lost one or more
// required objects (e.g. a NEW table added to SCHEMAS for a new feature but not
// yet created in the live Supabase project), every request that touches that
// object fails with PostgREST "Could not find the table ... in the schema
// cache" (PGRST205). This module is the real fix for that recurring error:
//
//   1. validate  — diff the live database against SCHEMAS
//   2. generate  — build idempotent SQL for exactly the missing objects
//                  (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / ...)
//   3. execute   — run each statement through exec_sql (SECURITY DEFINER RPC,
//                  bypasses RLS) so the browser can repair the schema it owns
//   4. reload    — NOTIFY pgrst, 'reload schema' so PostgREST refreshes its
//                  schema cache and the new objects are immediately addressable
//   5. revalidate — confirm the repair actually took effect
//
// Everything produced here is idempotent, so re-running on an already-healthy
// database is a no-op and a partially-failed repair can simply be retried.

import { DatabaseValidator } from '../setup-wizard/DatabaseValidator.js';
import { SqlGenerator } from '../setup-wizard/SqlGenerator.js';
import { SCHEMAS } from './models/index.js';

const RELOAD_SCHEMA_SQL = "NOTIFY pgrst, 'reload schema';";

// Split a SQL script into individual statements. Handles `$$ ... $$` (and
// `$tag$ ... $tag$`) dollar-quoted bodies, `'...'` single-quoted strings with
// `''` escapes, `--` line comments, and `/* ... */` block comments — so a `;`
// inside a function body or a string is never mistaken for a statement end.
export function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingle = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag = null;
  let i = 0;

  const push = () => {
    const trimmed = current.trim();
    if (trimmed) statements.push(trimmed);
    current = '';
  };

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      current += ch;
      if (ch === '\n') inLineComment = false;
      i += 1;
      continue;
    }

    if (inBlockComment) {
      current += ch;
      if (ch === '*' && next === '/') {
        current += '/';
        i += 2;
        inBlockComment = false;
        continue;
      }
      i += 1;
      continue;
    }

    if (inSingle) {
      current += ch;
      if (ch === "'") {
        if (next === "'") {
          current += "'";
          i += 2;
          continue;
        }
        inSingle = false;
      }
      i += 1;
      continue;
    }

    if (dollarTag) {
      current += ch;
      if (current.endsWith(dollarTag)) dollarTag = null;
      i += 1;
      continue;
    }

    if (ch === '-' && next === '-') {
      inLineComment = true;
      current += ch + next;
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      current += ch + next;
      i += 2;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      current += ch;
      i += 1;
      continue;
    }
    if (ch === '$') {
      const match = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        dollarTag = match[0];
        current += match[0];
        i += match[0].length;
        continue;
      }
    }
    if (ch === ';') {
      push();
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  push();
  return statements;
}

// Lightweight schema diff used for the startup health check. Returns the
// tables and columns that SCHEMAS requires but the live database is missing.
// Uses a single information_schema query (via exec_sql) instead of one probe
// per table/column, so it stays fast even as SCHEMAS grows.
export async function getSchemaGap(db, schema = SCHEMAS) {
  const required = Object.values(schema).filter((d) => d && typeof d === 'object' && d.table);

  const tableRows = await db.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  const existingTables = new Set((tableRows || []).map((r) => r.table_name));

  const missingTables = [];
  const missingColumns = [];
  for (const def of required) {
    if (!existingTables.has(def.table)) {
      missingTables.push(def.table);
    }
  }

  if (missingTables.length === 0) {
    const colRows = await db.query(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`
    );
    const existingCols = new Map();
    for (const r of colRows || []) {
      if (!existingCols.has(r.table_name)) existingCols.set(r.table_name, new Set());
      existingCols.get(r.table_name).add(r.column_name);
    }
    for (const def of required) {
      const cols = existingCols.get(def.table);
      if (!cols) {
        missingTables.push(def.table);
        continue;
      }
      for (const col of def.columns || []) {
        if (!cols.has(col)) missingColumns.push({ table: def.table, column: col });
      }
    }
  }

  return {
    missingTables,
    missingColumns,
    missingCount: missingTables.length + missingColumns.length,
  };
}

// Validate the live database and generate idempotent SQL for every missing or
// incompatible object. Returns { sql, report } — `sql` is empty when the
// database is already fully compatible.
export async function generateRepairSql(db, schema = SCHEMAS) {
  const validator = new DatabaseValidator(db);
  const report = await validator.validateAll(schema);
  if (report.valid) return { sql: '', report };

  const generator = new SqlGenerator(schema);
  const sql = generator.generate({ missing: report.missing, issues: report.issues });
  return { sql, report };
}

// Execute each statement in a SQL script through db.query() (exec_sql RPC).
// Statements are independent and idempotent, so a single failure (e.g. a
// policy that already exists) is recorded and the rest continue to run.
export async function executeSqlStatements(db, sql, options = {}) {
  const statements = splitSqlStatements(sql);
  const executed = [];
  const failed = [];
  const total = statements.length;

  for (const statement of statements) {
    try {
      await db.query(statement);
      executed.push(statement);
    } catch (err) {
      failed.push({ statement, error: err.message || String(err) });
    }
    if (options.onProgress) {
      options.onProgress({ executed: executed.length, failed: failed.length, total });
    }
  }

  return { executed, failed, total };
}

// Full auto-repair: validate → generate → execute → reload PostgREST cache →
// revalidate. Returns a summary of what happened and the post-repair report.
// Safe to run on a healthy database (it is a no-op) and safe to retry after a
// partial failure (all generated statements are idempotent).
export async function autoRepairSchema(db, options = {}) {
  const schema = options.schema || SCHEMAS;

  const { sql, report } = await generateRepairSql(db, schema);
  const wasDegraded = report.missing.length > 0 || (report.issues && report.issues.length > 0);

  if (!wasDegraded) {
    return {
      compatible: true,
      repaired: false,
      executed: [],
      failed: [],
      statements: [],
      report,
      before: report,
    };
  }

  let executed = [];
  let failed = [];
  let statements = [];
  if (sql.trim()) {
    statements = splitSqlStatements(sql);
    const result = await executeSqlStatements(db, sql, options);
    executed = result.executed;
    failed = result.failed;

    // Make sure PostgREST drops its stale schema cache so the newly created
    // objects are addressable by name on the very next request (this is the
    // step that prevents a fresh PGRST205 after a successful repair).
    try {
      await db.query(RELOAD_SCHEMA_SQL);
    } catch {
      // Supabase already sends NOTIFY pgrst on DDL via its event trigger, so
      // an explicit reload failure is not fatal.
    }
  }

  const validator = new DatabaseValidator(db);
  const after = await validator.validateAll(schema);

  return {
    compatible: after.valid,
    repaired: after.valid,
    executed,
    failed,
    statements,
    report: after,
    before: report,
  };
}
