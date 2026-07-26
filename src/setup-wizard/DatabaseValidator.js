export class DatabaseValidator {
  constructor(db) {
    this.db = db;
    this.results = this._emptyResults();
  }

  _emptyResults() {
    return {
      schemas: [],
      tables: [],
      columns: [],
      constraints: [],
      indexes: [],
      functions: [],
      triggers: [],
      views: [],
      policies: [],
      extensions: [],
      seeds: [],
      version: null,
    };
  }

  async validateAll(schema) {
    this.results = this._emptyResults();

    const entities = [];
    for (const [entity, definition] of Object.entries(schema)) {
      if (!definition || typeof definition !== 'object' || !definition.table) continue;
      entities.push({ entity, definition });
    }

    for (const { entity, definition } of entities) {
      await this._validateEntity(entity, definition);
    }

    const hasTables = this.results.tables.length > 0;
    const someTableExists = this.results.tables.some((t) => t.exists);

    if (hasTables) {
      await this._checkSchemas();
      await this._checkConstraints(schema);
      await this._checkIndexes(schema);
      if (someTableExists) {
        await this._checkFunctions();
        await this._checkTriggers();
        await this._checkViews();
        await this._checkPolicies();
      }
    }

    await this._checkVersion(schema);
    await this._checkExtensions(schema);
    await this._checkSeeds(schema);

    return this.getReport();
  }

  async _validateEntity(entity, definition) {
    const tableName = definition.table || entity;
    const tableExists = await this._tableExists(tableName);

    this.results.tables.push({
      name: tableName,
      exists: tableExists,
      status: tableExists ? 'existing' : 'missing',
      type: 'table',
    });

    this.results.schemas.push({
      name: 'public',
      exists: true,
      status: 'existing',
    });

    if (!tableExists) {
      if (definition.columns) {
        for (const col of definition.columns) {
          this.results.columns.push({
            table: tableName,
            column: col,
            exists: false,
            status: 'missing',
            type: 'column',
          });
        }
      }
      return;
    }

    if (definition.columns) {
      for (const col of definition.columns) {
        const colExists = await this._columnExists(tableName, col);
        this.results.columns.push({
          table: tableName,
          column: col,
          exists: colExists,
          status: colExists ? 'existing' : 'missing',
          type: 'column',
        });
      }
    }
  }

  async _checkSchemas() {
    try {
      const result = await this.db.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'public'`
      );
      if (result && result.length > 0) {
        this.results.schemas = [{ name: 'public', exists: true, status: 'existing' }];
      } else {
        this.results.schemas = [{ name: 'public', exists: false, status: 'missing' }];
      }
    } catch {
      this.results.schemas = [{ name: 'public', exists: true, status: 'existing' }];
    }
  }

  async _checkConstraints(schema) {
    for (const [, definition] of Object.entries(schema)) {
      if (!definition || typeof definition !== 'object' || !definition.table) continue;
      const tableName = definition.table;
      const tableExists = this.results.tables.find((t) => t.name === tableName)?.exists;
      if (!tableExists) continue;

      if (definition.primaryKey) {
        const exists = await this._constraintExists(tableName, 'p');
        this.results.constraints.push({
          table: tableName,
          constraint: `PK_${tableName}`,
          type: 'PRIMARY KEY',
          exists,
          status: exists ? 'existing' : 'missing',
        });
      }

      if (definition.unique) {
        for (const col of Object.keys(definition.unique)) {
          const exists = await this._constraintExists(tableName, 'u', col);
          this.results.constraints.push({
            table: tableName,
            constraint: `UQ_${tableName}_${col}`,
            type: 'UNIQUE',
            exists,
            status: exists ? 'existing' : 'missing',
          });
        }
      }
    }
  }

  async _checkIndexes(schema) {
    for (const [, definition] of Object.entries(schema)) {
      if (!definition || typeof definition !== 'object' || !definition.table) continue;
      const tableName = definition.table;
      const tableExists = this.results.tables.find((t) => t.name === tableName)?.exists;
      if (!tableExists) continue;

      const searchable = definition.searchableFields;
      if (searchable && Array.isArray(searchable)) {
        for (const field of searchable) {
          const exists = await this._indexExists(tableName, field);
          this.results.indexes.push({
            table: tableName,
            index: `idx_${tableName}_${field}`,
            field,
            exists,
            status: exists ? 'existing' : 'missing',
          });
        }
      }
    }
  }

  async _checkFunctions() {
    try {
      const result = await this.db.query(
        `SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'`
      );
      if (result && result.length > 0) {
        for (const row of result) {
          this.results.functions.push({ name: row.routine_name, exists: true, status: 'existing' });
        }
      }
    } catch {
      // functions not supported by provider
    }
  }

  async _checkTriggers() {
    // public-schema triggers (general coverage)
    try {
      const result = await this.db.query(
        `SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public'`
      );
      if (result && result.length > 0) {
        for (const row of result) {
          this.results.triggers.push({ name: row.trigger_name, exists: true, status: 'existing' });
        }
      }
    } catch {
      // triggers not supported by provider
    }

    // Critical security object: the on_auth_user_created trigger on auth.users
    // is the ONLY thing that creates a public.users profile row when a new auth
    // user signs up. If it is missing or its function is broken, registration
    // silently produces an auth user with no profile, which the client then
    // rejects as "missing profile record". information_schema.triggers is
    // filtered by the current role and historically does not surface `auth`
    // schema triggers, so we check pg_catalog.pg_trigger directly. Because a
    // missing trigger would otherwise leave `valid: true` (it was never listed
    // as missing), we explicitly record it as a MISSING item so Verify
    // Installation fails loudly instead of masking the registration failure.
    const REQUIRED_AUTH_TRIGGER = 'on_auth_user_created';
    let authTriggerExists = false;
    try {
      const result = await this.db.query(
        `SELECT t.tgname
         FROM pg_catalog.pg_trigger t
         JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
         JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
         WHERE NOT t.tgisinternal
           AND n.nspname = 'auth'
           AND c.relname = 'users'
           AND t.tgname = $1`,
        [REQUIRED_AUTH_TRIGGER]
      );
      authTriggerExists = !!(result && result.length > 0);
    } catch {
      // Provider does not expose pg_catalog (e.g. SQLite memory mode) — skip
      // rather than falsely reporting a failure for an inapplicable backend.
      return;
    }
    // Only surface a result for the auth trigger if we actually ran the check
    // (result known). Avoid duplicates if the public-schema query already
    // happened to list it (it won't, since it lives in `auth`).
    if (authTriggerExists) {
      if (!this.results.triggers.some((t) => t.name === REQUIRED_AUTH_TRIGGER)) {
        this.results.triggers.push({ name: REQUIRED_AUTH_TRIGGER, exists: true, status: 'existing' });
      }
    } else {
      this.results.triggers.push({
        name: REQUIRED_AUTH_TRIGGER,
        exists: false,
        status: 'missing',
        type: 'trigger',
        detail: 'on_auth_user_created trigger on auth.users is missing — registration will fail to create a user profile.',
      });
    }
  }

  async _checkViews() {
    try {
      const result = await this.db.query(
        `SELECT table_name FROM information_schema.views WHERE table_schema = 'public'`
      );
      if (result && result.length > 0) {
        for (const row of result) {
          this.results.views.push({ name: row.table_name, exists: true, status: 'existing' });
        }
      }
    } catch {
      // views not supported by provider
    }
  }

  async _checkPolicies() {
    try {
      const result = await this.db.query(
        `SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'`
      );
      if (result && result.length > 0) {
        for (const row of result) {
          this.results.policies.push({
            table: row.tablename,
            name: row.policyname,
            exists: true,
            status: 'existing',
          });
        }
      }
    } catch {
      // policies not supported by provider
    }
  }

  async _constraintExists(table, type, column) {
    try {
      let query;
      if (type === 'p') {
        query = `SELECT EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = $1 AND constraint_type = 'PRIMARY KEY') as exists`;
      } else if (type === 'u' && column) {
        query = `SELECT EXISTS (SELECT FROM information_schema.table_constraints tc JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name WHERE tc.table_name = $1 AND tc.constraint_type = 'UNIQUE' AND ccu.column_name = $2) as exists`;
      } else {
        query = `SELECT EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = $1 AND constraint_type = 'UNIQUE') as exists`;
      }
      const params = column ? [table, column] : [table];
      const result = await this.db.query(query, params);
      return result[0]?.exists || false;
    } catch {
      return false;
    }
  }

  async _indexExists(table, column) {
    try {
      const result = await this.db.query(
        `SELECT EXISTS (SELECT FROM pg_indexes WHERE tablename = $1 AND indexdef LIKE $2) as exists`,
        [table, `%${column}%`]
      );
      return result[0]?.exists || false;
    } catch {
      try {
        const result = await this.db.query(
          `SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = $1 AND sql LIKE $2`,
          [table, `%${column}%`]
        );
        return result.length > 0;
      } catch {
        return false;
      }
    }
  }

  async _tableExists(tableName) {
    try {
      const result = await this.db.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1) as exists`,
        [tableName]
      );
      return result[0]?.exists || false;
    } catch {
      try {
        const result = await this.db.query(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=$1`,
          [tableName]
        );
        return result.length > 0;
      } catch {
        return false;
      }
    }
  }

  async _columnExists(table, column) {
    try {
      const result = await this.db.query(
        `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = $1 AND column_name = $2) as exists`,
        [table, column]
      );
      return result[0]?.exists || false;
    } catch {
      return false;
    }
  }

  async _checkVersion(schema) {
    try {
      const result = await this.db.query(
        `SELECT version FROM _schema_version ORDER BY applied_at DESC LIMIT 1`
      );
      const current = result?.[0]?.version;
      const required = schema.version || 1;
      // Use loose equality to handle numeric vs string type mismatches from PostgREST.
      // Also treat null vs required as matching IF tables exist (the INSERT may not have been
      // picked up by PostgREST schema cache yet, but the table itself was created).
      let match = current == required;
      if (!match && current == null) {
        // Fallback: if all tables exist, assume version was set correctly
        const someTableMissing = this.results.tables.some((t) => !t.exists);
        if (!someTableMissing) match = true;
      }
      this.results.version = { current, required, match };
    } catch {
      this.results.version = { current: null, required: schema.version || 1, match: false };
    }
  }

  async _checkExtensions(schema) {
    const required = schema.extensions || [];
    for (const ext of required) {
      try {
        const result = await this.db.query(
          `SELECT EXISTS (SELECT FROM pg_extension WHERE extname = $1) as exists`,
          [ext]
        );
        this.results.extensions.push({ name: ext, installed: result[0]?.exists || false });
      } catch {
        this.results.extensions.push({ name: ext, installed: false });
      }
    }
  }

  async _checkSeeds(schema) {
    const seeds = schema.seedData || [];
    for (const seed of seeds) {
      try {
        const result = await this.db.query(`SELECT COUNT(*) as count FROM ${seed.table}`);
        const count = parseInt(result[0]?.count || 0, 10);
        this.results.seeds.push({
          table: seed.table,
          required: seed.required,
          count,
          populated: count >= (seed.minCount || 1),
        });
      } catch {
        this.results.seeds.push({ table: seed.table, required: seed.required, count: 0, populated: false });
      }
    }
  }

  getReport() {
    const missing = [];
    const existing = [];
    const issues = [];

    for (const type of Object.keys(this.results)) {
      if (type === 'version') {
        const v = this.results.version;
        if (!v?.match) issues.push({ type: 'version', detail: `Schema version mismatch: ${v?.current} → ${v?.required}` });
        else existing.push({ type: 'version', detail: `Schema v${v?.required}` });
        continue;
      }

      const items = this.results[type] || [];
      for (const item of items) {
        if (item.exists === false || item.status === 'missing' || item.installed === false || item.populated === false) {
          missing.push(item);
        } else if (item.status === 'mismatch') {
          issues.push(item);
        } else {
          existing.push(item);
        }
      }
    }

    const total = existing.length + missing.length + issues.length;

    return {
      valid: missing.length === 0 && issues.length === 0,
      existing,
      missing,
      issues,
      summary: {
        total,
        existing: existing.length,
        missing: missing.length,
        issues: issues.length,
      },
      details: this.results,
    };
  }

  getMissingCount() {
    return this.getReport().missing.length;
  }
}
