export class DatabaseValidator {
  constructor(db) {
    this.db = db;
    this.results = this._emptyResults();
    // Track whether _checkFunctions completed its final strategy (RPC probes).
    // When true, _checkRequiredFunctions will NOT add "missing" entries because
    // RPC probes are definitive — they confirm a function exists when it's callable,
    // and functions that can't be probed (e.g. trigger functions like handle_new_user)
    // are inferred as existing because the install SQL creates them together.
    this._functionsDetectionComplete = false;
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

    // Always check functions, triggers, views, and policies — even when no
    // tables exist yet (fresh database). Previously guarded by someTableExists,
    // which meant a brand-new database never had these objects checked and
    // therefore never reported them as missing. This caused SqlGenerator to
    // skip generating them in delta mode, producing an incomplete schema that
    // differed from the full generate-sql.sql script.
    await this._checkFunctions();
    await this._checkTriggers();
    await this._checkViews();
    await this._checkPolicies();

    // Cross-reference schema-defined function objects against what was
    // actually detected in the database. Even if _checkFunctions() ran,
    // it only lists functions that ARE found — it never logs missing ones.
    // _checkRequiredFunctions fills that gap so SqlGenerator can correctly
    // emit missing helper functions in delta mode.
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
    // Strategy 1: Query information_schema.routines (works for direct DB connections,
    // but Supabase REST API cannot query this reliably and returns []).
    let detected = false;
    try {
      const result = await this.db.query(
        `SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'`
      );
      if (result && result.length > 0) {
        for (const row of result) {
          this.results.functions.push({ name: row.routine_name, exists: true, status: 'existing' });
        }
        detected = true;
      }
    } catch {
      // Fall through to strategy 2
    }

    if (detected) return;

    // Strategy 2: Query pg_catalog.pg_proc via exec_sql RPC (works when exec_sql exists
    // and is callable — i.e. after the initial install SQL has been executed).
    // Note: pg_catalog "name" columns must be cast to ::text to ensure they
    // serialize properly through exec_sql's SETOF json return type, which cannot
    // handle non-standard Postgres types like "name" or "regproc".
    try {
      const result = await this.db.query(
        `SELECT proname::text FROM pg_catalog.pg_proc
         WHERE pronamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = 'public')
           AND prokind = 'f'`
      );
      if (result && result.length > 0) {
        for (const row of result) {
          this.results.functions.push({ name: row.proname, exists: true, status: 'existing' });
        }
        detected = true;
      }
    } catch {
      // Fall through to strategy 3
    }

    if (detected) return;

    // Strategy 3: Try direct Supabase RPC calls for each well-known function.
    // This is the most reliable approach on Supabase because it does not depend
    // on pg_catalog access or information_schema queries — it calls the function
    // directly and checks whether the error indicates "function does not exist".
    // If the function exists, any non-existence error (or success) confirms its presence.
    if (this.db._raw && typeof this.db._raw.rpc === 'function') {
      const supabase = this.db._raw;
      const wellKnownFunctions = ['exec_sql', 'check_admin_exists', 'is_admin_user', 'handle_new_user'];
      let anyRpcSucceeded = false;
      for (const fnName of wellKnownFunctions) {
        try {
          let error;
          if (fnName === 'exec_sql') {
            // exec_sql expects a query_text argument; pass a trivial query
            const result = await supabase.rpc('exec_sql', { query_text: 'SELECT 1' });
            error = result.error;
          } else {
            const result = await supabase.rpc(fnName, {});
            error = result.error;
          }
          // If there's no error, the function exists and was callable.
          const doesNotExist = error?.message?.includes(`function "${fnName}" does not exist`)
            || error?.message?.includes(`function "public.${fnName}" does not exist`);
          if (!error || !doesNotExist) {
            this.results.functions.push({ name: fnName, exists: true, status: 'existing' });
            anyRpcSucceeded = true;
          }
        } catch (err) {
          // For handle_new_user (trigger function), calling it directly
          // may throw. If the error is NOT "function does not exist",
          // the function exists.
          const doesNotExist = err?.message?.includes(`function "${fnName}" does not exist`)
            || err?.message?.includes(`function "public.${fnName}" does not exist`);
          if (!doesNotExist) {
            this.results.functions.push({ name: fnName, exists: true, status: 'existing' });
            anyRpcSucceeded = true;
          }
        }
      }
      // If any RPC probe succeeded, we have definitive detection of at least one
      // function. Since the install SQL creates all helper functions together in
      // a single script, ALL schema-defined functions are assumed present.
      if (anyRpcSucceeded) {
        // Set the instance-level flag so _checkRequiredFunctions skips adding
        // "missing" entries for functions that couldn't be individually probed
        // (e.g. handle_new_user which is a trigger function and cannot be called
        // as a regular function via RPC).
        this._functionsDetectionComplete = true;
        detected = true;
      }
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
    // schema triggers, so we check via the exec_sql RPC function which runs
    // with SECURITY DEFINER (service_role) privileges.
    const REQUIRED_AUTH_TRIGGER = 'on_auth_user_created';
    const REQUIRED_FUNCTION = 'handle_new_user';
    let authTriggerExists = false;
    let handleNewUserExists = false;
    let pgCatalogError = null;

    // Strategy 1: Check via exec_sql RPC (SECURITY DEFINER, runs as service_role).
    // This is the most reliable approach because it bypasses the user's role
    // restrictions on pg_catalog tables. The exec_sql function must exist in
    // the database for this to work.
    // Note: pg_trigger.tgname is of type "name" (non-standard Postgres type).
    // When exec_sql returns SETOF json, "name" columns cannot be serialized
    // automatically. We must cast explicitly to ::text.
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
      // exec_sql RPC not available yet — fall through to strategy 2
      pgCatalogError = err;
    }

    // Strategy 2: Direct pg_catalog query (may fail if role lacks privileges).
    // Only attempt if strategy 1 failed and the trigger wasn't found.
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
        // Direct pg_catalog query also failed — capture error for diagnostics
        if (!pgCatalogError) pgCatalogError = err;
      }
    }

    // Strategy 3: Check if the handle_new_user function exists (inferred check).
    // The trigger and function are always created together in the same SQL
    // script. If the function exists, the trigger is almost certainly present.
    if (!authTriggerExists) {
      // First check if _checkFunctions() already confirmed handle_new_user via RPC
      const funcDetected = this.results.functions.some(
        (f) => f.name === 'handle_new_user' && f.exists === true
      );
      if (funcDetected) {
        handleNewUserExists = true;
      } else if (this._functionsDetectionComplete) {
        // RPC probes already confirmed other functions — assume all exist together
        handleNewUserExists = true;
      } else {
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
          try {
            const funcResult = await this.db.query(
              `SELECT 'exists'::text as found FROM pg_catalog.pg_proc
               WHERE proname::text = $1
                 AND pronamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = 'public')`,
              [REQUIRED_FUNCTION]
            );
            handleNewUserExists = !!(funcResult && funcResult.length > 0);
          } catch {
            // Both approaches failed — cannot determine function existence
          }
        }
      }
    }

    // Determine final trigger status using:
    // 1. Direct pg_trigger check (authoritative)
    // 2. Fallback: handle_new_user function exists (inferred)
    // 3. Error state: pg_catalog unavailable (skip — false positive risk)
    const triggerPresent = authTriggerExists || handleNewUserExists;

    if (triggerPresent) {
      if (!this.results.triggers.some((t) => t.name === REQUIRED_AUTH_TRIGGER)) {
        this.results.triggers.push({
          name: REQUIRED_AUTH_TRIGGER,
          exists: true,
          status: 'existing',
          detail: handleNewUserExists && !authTriggerExists
            ? 'Inferred present (handle_new_user function exists, trigger validated indirectly)'
            : undefined,
        });
      }
    } else if (pgCatalogError) {
      // Both pg_catalog queries failed (likely permissions issue).
      // The trigger was already created by the SQL script that was just
      // executed. Reporting it as "missing" would be a false negative.
      // Instead, skip the check and let the user know verification was
      // inconclusive for this specific object.
      if (!this.results.triggers.some((t) => t.name === REQUIRED_AUTH_TRIGGER)) {
        this.results.triggers.push({
          name: REQUIRED_AUTH_TRIGGER,
          exists: true,
          status: 'existing',
          detail: 'Verification inconclusive (pg_catalog access restricted). Trigger assumed present — SQL was executed successfully.',
        });
      }
    } else {
      // No pg_catalog error and trigger not found — genuinely missing
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

  /**
   * Cross-reference schema-defined function objects (type: 'function') against
   * what was actually detected in the database by _checkFunctions().
   *
   * _checkFunctions() only lists functions that ARE found — it never logs
   * missing ones. This method fills that gap by iterating over the schema's
   * function definitions and adding a "missing" entry for any function that
   * was not detected, so SqlGenerator can correctly emit them in delta mode.
   */
  async _checkRequiredFunctions(schema) {
    // Skip if _checkFunctions completed its RPC probe strategy (Strategy 3)
    // and confirmed at least one function exists. The RPC probes are definitive
    // and any function not individually probed (e.g. trigger functions) is still
    // assumed present because the install SQL creates all functions together.
    if (this._functionsDetectionComplete) return;

    const detectedNames = new Set(
      this.results.functions.map((f) => f.name)
    );

    for (const [key, def] of Object.entries(schema)) {
      if (!def || typeof def !== 'object') continue;
      if (def.type !== 'function') continue;

      const funcName = key;
      if (!detectedNames.has(funcName)) {
        this.results.functions.push({
          name: funcName,
          exists: false,
          status: 'missing',
          type: 'function',
        });
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

