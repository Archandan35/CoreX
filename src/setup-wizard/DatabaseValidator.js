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
    }

    await this._checkFunctions();
    await this._checkTriggers();
    await this._checkViews();
    await this._checkPolicies();

    await this._checkRequiredFunctions(schema);

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
    let detected = false;

    // Strategy 1: information_schema.routines
    try {
      const result = await this.db.query(
        `SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'`
      );
      if (result && result.length > 0) {
        for (const row of result) {
          this.results.functions.push({ name: row.routine_name, exists: true, status: 'existing', type: 'function' });
        }
        detected = true;
      }
    } catch {
      // fall through
    }

    if (detected) return;

    // Strategy 2: pg_catalog via exec_sql
    try {
      const result = await this.db.query(
        `SELECT proname::text FROM pg_catalog.pg_proc
         WHERE pronamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = 'public')
           AND prokind = 'f'`
      );
      if (result && result.length > 0) {
        for (const row of result) {
          this.results.functions.push({ name: row.proname, exists: true, status: 'existing', type: 'function' });
        }
        detected = true;
      }
    } catch {
      // fall through
    }

    if (detected) return;

    // Strategy 3: Direct Supabase RPC probes — each function tracked independently.
    // CRITICAL FIX: Do NOT exit early when one function is found.
    // Each function (exec_sql, check_admin_exists, is_admin_user) is probed
    // independently. If exec_sql returns 404 (fresh DB) but is_admin_user
    // also returns 404, BOTH must be flagged as missing. Previously a bug
    // where detecting any single function would skip checking the others.
    // This strategy ONLY records functions that respond successfully.
    // Functions that return 404 are left unrecorded. _checkRequiredFunctions()
    // then adds them as 'missing'. This works correctly even in a fresh DB.
    if (this.db._raw && typeof this.db._raw.rpc === 'function') {
      const supabase = this.db._raw;
      const wellKnownFunctions = ['exec_sql', 'check_admin_exists', 'is_admin_user', 'handle_new_user'];
      for (const fnName of wellKnownFunctions) {
        try {
          let error;
          if (fnName === 'exec_sql') {
            const result = await supabase.rpc('exec_sql', { query_text: 'SELECT 1' });
            error = result.error;
          } else {
            const result = await supabase.rpc(fnName, {});
            error = result.error;
          }
          const is404 = error?.code === '404' || error?.status === 404;
          const doesNotExist = is404
            || error?.message?.includes(`function "${fnName}" does not exist`)
            || error?.message?.includes(`function "public.${fnName}" does not exist`)
            || error?.message?.includes('Not found')
            || error?.message?.includes('not found')
            || error?.message?.includes('does not exist');
          if (!error || !doesNotExist) {
            // Function exists — add to results
            this.results.functions.push({ name: fnName, exists: true, status: 'existing', type: 'function' });
          }
          // If function does NOT exist, DON'T add it here.
          // _checkRequiredFunctions() later will add it as 'missing'.
        } catch (err) {
          const is404 = err?.code === '404' || err?.status === 404;
          const doesNotExist = is404
            || err?.message?.includes(`function "${fnName}" does not exist`)
            || err?.message?.includes(`function "public.${fnName}" does not exist`)
            || err?.message?.includes('Not found')
            || err?.message?.includes('not found')
            || err?.message?.includes('does not exist');
          if (!doesNotExist) {
            this.results.functions.push({ name: fnName, exists: true, status: 'existing', type: 'function' });
          }
          // If doesNotExist is true, the function doesn't exist — leave unrecorded.
          // _checkRequiredFunctions() will add it as 'missing'.
        }
      }
    }
  }

  async _checkTriggers() {
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
      // triggers not supported
    }

    const REQUIRED_AUTH_TRIGGER = 'on_auth_user_created';
    let authTriggerExists = false;
    let handleNewUserExists = false;
    let pgCatalogError = null;

    // Strategy 1: Check via exec_sql RPC (SECURITY DEFINER, runs as service_role)
    try {
      const rpcResult = await this.db.query(
        `SELECT * FROM exec_sql(
          'SELECT t.tgname::text
           FROM pg_catalog.pg_trigger t
           JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
           JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
           WHERE NOT t.tgisinternal
             AND n.nspname = ''auth''
             AND c.relname = ''users''
             AND t.tgname = ''on_auth_user_created'''
        )`
      );
      authTriggerExists = !!(rpcResult && rpcResult.length > 0);
    } catch (err) {
      pgCatalogError = err;
    }

    // Strategy 2: Direct pg_catalog query
    if (!authTriggerExists) {
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
      } catch (err) {
        if (!pgCatalogError) pgCatalogError = err;
      }
    }

    // Strategy 3: Inferred from handle_new_user function (only when pg_catalog restricted)
    if (!authTriggerExists && pgCatalogError) {
      try {
        const rpcFuncResult = await this.db.query(
          `SELECT * FROM exec_sql(
            'SELECT ''exists''::text as found FROM pg_catalog.pg_proc
             WHERE proname::text = ''handle_new_user''
               AND pronamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = ''public'')'
          )`
        );
        handleNewUserExists = !!(rpcFuncResult && rpcFuncResult.length > 0);
      } catch {
        // cannot determine
      }
    }

    if (authTriggerExists) {
      if (!this.results.triggers.some((t) => t.name === REQUIRED_AUTH_TRIGGER)) {
        this.results.triggers.push({ name: REQUIRED_AUTH_TRIGGER, exists: true, status: 'existing' });
      }
    } else if (handleNewUserExists) {
      if (!this.results.triggers.some((t) => t.name === REQUIRED_AUTH_TRIGGER)) {
        this.results.triggers.push({
          name: REQUIRED_AUTH_TRIGGER,
          exists: true,
          status: 'existing',
          detail: 'Inferred present (pg_catalog restricted, handle_new_user function confirmed via exec_sql RPC)',
        });
      }
    } else if (pgCatalogError) {
      if (!this.results.triggers.some((t) => t.name === REQUIRED_AUTH_TRIGGER)) {
        this.results.triggers.push({
          name: REQUIRED_AUTH_TRIGGER,
          exists: false,
          status: 'missing',
          type: 'trigger',
          detail: 'Cannot verify on_auth_user_created trigger (pg_catalog access restricted). Execute the SQL in Supabase SQL Editor and verify again.',
        });
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
      // views not supported
    }
  }

  async _checkPolicies() {
    try {
      const result = await this.db.query(
        `SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'`
      );
      if (result && result.length > 0) {
        for (const row of result) {
          this.results.policies.push({ table: row.tablename, name: row.policyname, exists: true, status: 'existing' });
        }
      }
    } catch {
      // policies not supported
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
      let match = current == required;
      if (!match && current == null) {
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
        this.results.seeds.push({ table: seed.table, required: seed.required, count, populated: count >= (seed.minCount || 1) });
      } catch {
        this.results.seeds.push({ table: seed.table, required: seed.required, count: 0, populated: false });
      }
    }
  }

  async _checkRequiredFunctions(schema) {
    const detectedNames = new Set(this.results.functions.map((f) => f.name));

    // Always ensure the 3 required helper functions are checked
    const requiredFunctions = ['exec_sql', 'check_admin_exists', 'is_admin_user'];

    // Add any additional functions defined in the schema
    for (const [key, def] of Object.entries(schema)) {
      if (!def || typeof def !== 'object') continue;
      if (def.type === 'function') {
        requiredFunctions.push(key);
      }
    }

    for (const funcName of requiredFunctions) {
      if (!detectedNames.has(funcName)) {
        this.results.functions.push({ name: funcName, exists: false, status: 'missing', type: 'function' });
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

    return {
      valid: missing.length === 0 && issues.length === 0,
      existing,
      missing,
      issues,
      summary: { total: existing.length + missing.length + issues.length, existing: existing.length, missing: missing.length, issues: issues.length },
      details: this.results,
    };
  }

  getMissingCount() {
    return this.getReport().missing.length;
  }
}
