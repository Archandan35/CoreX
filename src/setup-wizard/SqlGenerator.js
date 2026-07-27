import { buildExecSqlFunction, buildCheckAdminExistsFunction, buildIsAdminUserFunction } from '../schema/models/index.js';

export class SqlGenerator {
  constructor(schema) {
    this.schema = schema;
    this._entities = this._collectEntities();
  }

  _collectEntities() {
    const entities = [];
    for (const [key, def] of Object.entries(this.schema)) {
      if (!def || typeof def !== 'object') continue;
      if (def.table || def.type === 'function') {
        entities.push({ key, def });
      }
    }
    return entities;
  }

  generateFullSchema() {
    return this.generate(null, { full: true });
  }

  generate(report, options = {}) {
    const full = options.full === true;
    const missing = report?.missing || [];

    this._usedDefaults = new Set();
    this._usedUnique = new Set();
    this._emittedIndexNames = new Set();

    const blocks = [];
    blocks.push(this._header());

    const helperFunctions = this._genHelperFunctions(report, full);
    if (helperFunctions.length > 0) {
      blocks.push(this._section('Helper Functions', helperFunctions));
    }

    const extBlocks = full ? this._genAllExtensions() : this._genMissingExtensions(missing);
    if (extBlocks.length > 0) {
      blocks.push(this._section('Extensions', extBlocks));
    }

    const tableBlocks = full ? this._genAllTables() : this._genMissingTables(missing);
    if (tableBlocks.length > 0) {
      blocks.push(this._section('Tables', tableBlocks));
    }

    const allTableNames = full
      ? new Set(this._entities.filter((e) => e.def.table).map((e) => e.def.table))
      : this._collectTableNames(missing);

    if (!full) {
      const colBlocks = this._genMissingColumns(missing);
      if (colBlocks.length > 0) {
        blocks.push(this._section('Columns', colBlocks));
      }
    }

    const constraintBlocks = full
      ? this._genAllConstraints()
      : this._genMissingConstraints(missing, allTableNames);
    if (constraintBlocks.length > 0) {
      blocks.push(this._section('Constraints', constraintBlocks));
    }

    const indexBlocks = full
      ? this._genAllIndexes()
      : this._genMissingIndexes(missing, allTableNames);
    if (indexBlocks.length > 0) {
      blocks.push(this._section('Indexes', indexBlocks));
    }

    const rlsBlocks = full ? this._genAllRLS() : this._genMissingRLS(missing);
    if (rlsBlocks.length > 0) {
      blocks.push(this._section('Row Level Security', rlsBlocks));
    }

    const triggerBlock = this._genUserTrigger();
    if (triggerBlock) {
      blocks.push(this._section('User Profile Trigger', [triggerBlock]));
    }

    const version = this.schema.version;
    if (version) {
      blocks.push(this._section('Schema Version', [this._genVersion(version)]));
    }

    const seedStmts = this._genSeedData();
    if (seedStmts.length > 0) {
      blocks.push(this._section('Seed Data', seedStmts));
    }

    blocks.push(this._footer());
    return blocks.filter(Boolean).join('\n\n');
  }

  _genHelperFunctions(report, full) {
    const blocks = [];
    const missing = report?.missing || [];

    const missingNames = new Set();
    for (const item of missing) {
      const name = item.name || (item.type === 'function' && item.name) || null;
      if (name) missingNames.add(name);
    }

    const isMissing = (name) => full || missing.some(
      (i) => i.name === name || (i.type === 'function' && i.name === name)
    );

    if (isMissing('exec_sql')) blocks.push(buildExecSqlFunction());
    if (isMissing('check_admin_exists')) blocks.push(buildCheckAdminExistsFunction());

    const isAdminNeeded = full
      || isMissing('is_admin_user')
      || missing.some((i) => (i.type === 'policy' || i.policyname) && i.table === 'users')
      || missing.some((i) => i.type === 'table' && i.name === 'users');
    if (isAdminNeeded) blocks.push(buildIsAdminUserFunction());

    return blocks;
  }

  _genAllExtensions() {
    return (this.schema.extensions || []).map((name) => `CREATE EXTENSION IF NOT EXISTS "${name}";`);
  }

  _genMissingExtensions(missing) {
    return missing.filter((i) => i.type === 'extension').map((e) => this._genExtension(e));
  }

  _genAllTables() {
    const blocks = [];
    for (const entity of this._entities) {
      if (!entity.def.table) continue;
      blocks.push(this._genTable({ name: entity.def.table, _def: entity.def }));
    }
    return blocks;
  }

  _genMissingTables(missing) {
    return missing.filter((i) => i.type === 'table').map((t) => this._genTable(t));
  }

  _collectTableNames(missing) {
    const names = new Set(this._entities.filter((e) => e.def.table).map((e) => e.def.table));
    for (const t of missing.filter((i) => i.type === 'table')) {
      if (t.name) names.add(t.name);
    }
    return names;
  }

  _genMissingColumns(missing) {
    const createdTableNames = new Set(missing.filter((i) => i.type === 'table').map((t) => t.name));
    const columns = missing.filter(
      (i) => (i.type === 'column' || (i.column && !i.type)) && !createdTableNames.has(i.table)
    );
    const grouped = {};
    for (const col of columns) {
      if (!grouped[col.table]) grouped[col.table] = [];
      grouped[col.table].push(col);
    }
    const blocks = [];
    for (const [tbl, cols] of Object.entries(grouped)) {
      for (const col of cols) blocks.push(this._genColumn(tbl, col));
    }
    return blocks;
  }

  _genAllConstraints() {
    const blocks = [];
    for (const entity of this._entities) {
      const def = entity.def;
      if (!def.table || !def.unique) continue;
      for (const [col] of Object.entries(def.unique)) {
        if (this._usedUnique.has(col)) continue;
        this._usedUnique.add(col);
        blocks.push(`ALTER TABLE ${def.table} ADD CONSTRAINT ${def.table}_${col}_key UNIQUE (${col});`);
      }
    }
    return blocks;
  }

  _genMissingConstraints(missing, allTableNames) {
    const constraints = missing.filter((i) => i.type === 'constraint' || i.constraint);
    const blocks = constraints.filter((c) => !c.exists).map((c) => this._genConstraint(c));
    for (const entity of this._entities) {
      const def = entity.def;
      if (!def.table || !def.unique) continue;
      for (const [col] of Object.entries(def.unique)) {
        if (this._usedUnique.has(col)) continue;
        this._usedUnique.add(col);
        const keyName = `${def.table}_${col}_key`;
        if (!constraints.some((c) => c.constraint === keyName) && allTableNames.has(def.table)) {
          blocks.push(`ALTER TABLE ${def.table} ADD CONSTRAINT ${def.table}_${col}_key UNIQUE (${col});`);
        }
      }
    }
    return blocks;
  }

  _genAllIndexes() {
    const blocks = [];
    for (const entity of this._entities) {
      const def = entity.def;
      if (!def.table || !def.searchableFields) continue;
      for (const field of def.searchableFields) {
        const idx = `idx_${def.table}_${field}`;
        if (this._emittedIndexNames.has(idx)) continue;
        this._emittedIndexNames.add(idx);
        blocks.push(`CREATE INDEX IF NOT EXISTS ${idx} ON ${def.table} (${field});`);
      }
    }
    return blocks;
  }

  _genMissingIndexes(missing, allTableNames) {
    const indexes = missing.filter((i) => i.type === 'index' || i.index);
    const blocks = indexes.map((ix) => this._genIndex(ix));
    for (const entity of this._entities) {
      const def = entity.def;
      if (!def.table || !def.searchableFields || !allTableNames.has(def.table)) continue;
      for (const field of def.searchableFields) {
        const idx = `idx_${def.table}_${field}`;
        if (this._emittedIndexNames.has(idx)) continue;
        this._emittedIndexNames.add(idx);
        if (!indexes.some((ix) => (ix.index || ix.name) === idx)) {
          blocks.push(`CREATE INDEX IF NOT EXISTS ${idx} ON ${def.table} (${field});`);
        }
      }
    }
    return blocks;
  }

  _genAllRLS() {
    const blocks = [];
    for (const entity of this._entities) {
      const def = entity.def;
      if (!def.table || !def.rls) continue;
      const rls = this._genRLS(def.table, def);
      if (rls) blocks.push(rls);
    }
    return blocks;
  }

  _genMissingRLS(missing) {
    const blocks = [];
    for (const entity of this._entities) {
      const def = entity.def;
      if (!def.table || !def.rls) continue;
      const tableMissing = missing.some((i) => i.type === 'table' && i.name === def.table);
      const anyPolicyFound = missing.some(
        (i) => (i.type === 'policy' || i.policyname) && i.table === def.table && i.exists !== false
      );
      if (tableMissing || !anyPolicyFound) {
        const rls = this._genRLS(def.table, def);
        if (rls) blocks.push(rls);
      }
    }
    return blocks;
  }

  _header() {
    return [
      '-- ============================================================',
      '-- CoreX Schema Installation Script',
      '-- Generated: ' + new Date().toISOString().split('T')[0],
      '-- Schema Version: ' + (this.schema.version || 1),
      '-- ============================================================',
      '',
    ].join('\n');
  }

  _footer() {
    return [
      '',
      '-- ============================================================',
      '-- Installation script complete',
      '-- ============================================================',
      '',
      "NOTIFY pgrst, 'reload schema';",
    ].join('\n');
  }

  _section(title, statements) {
    if (!statements || statements.length === 0) return null;
    return ['', '-- ===== ' + title + ' =====', '', ...statements.filter(Boolean)].join('\n');
  }

  _genExtension(item) {
    return 'CREATE EXTENSION IF NOT EXISTS "' + item.name + '";';
  }

  _genTable(item) {
    const def = item._def || Object.values(this.schema).find((d) => (d.table || '') === item.name);
    if (!def) return '-- Missing table definition for: ' + item.name;

    const tableName = def.table || item.name;
    const colDefs = def.columns.map((col) => {
      const type = def.columnTypes?.[col] || 'TEXT';
      const parts = ['  ' + col + ' ' + type];
      if (def.primaryKey === col) parts.push('PRIMARY KEY');
      if (!def.nullable?.includes(col)) parts.push('NOT NULL');
      if (def.defaults?.[col]) {
        parts.push('DEFAULT ' + def.defaults[col]);
        this._usedDefaults.add(col);
      }
      return parts.join(' ');
    });
    if (def.unique) {
      for (const [col] of Object.entries(def.unique)) {
        colDefs.push('  UNIQUE (' + col + ')');
        this._usedUnique.add(col);
      }
    }
    return 'CREATE TABLE IF NOT EXISTS ' + tableName + ' (\n' + colDefs.join(',\n') + '\n);';
  }

  _genColumn(tableName, item) {
    const def = Object.values(this.schema).find((d) => (d.table || '') === tableName);
    const col = item.column;
    const type = def?.columnTypes?.[col] || 'TEXT';
    let sql = 'ALTER TABLE ' + tableName + ' ADD COLUMN IF NOT EXISTS ' + col + ' ' + type;
    if (def && !def.nullable?.includes(col)) sql += ' NOT NULL';
    if (def?.defaults?.[col]) sql += ' DEFAULT ' + def.defaults[col];
    return sql + ';';
  }

  _genConstraint(item) {
    const table = item.table;
    const name = item.constraint;
    if (item.type === 'PRIMARY KEY' || name?.startsWith('PK_')) {
      return 'ALTER TABLE ' + table + ' ADD PRIMARY KEY (' + (item.column || 'id') + ');';
    }
    if (item.type === 'UNIQUE' || name?.includes('_key')) {
      return 'ALTER TABLE ' + table + ' ADD CONSTRAINT ' + table + '_' + (item.column || 'email') + '_key UNIQUE (' + (item.column || 'email') + ');';
    }
    return 'ALTER TABLE ' + table + ' ADD CONSTRAINT ' + name + ' UNIQUE (' + (item.column || 'id') + ');';
  }

  _genIndex(item) {
    const table = item.table;
    const field = item.field || item.column || 'id';
    const idxName = item.index || 'idx_' + table + '_' + field;
    return 'CREATE INDEX IF NOT EXISTS ' + idxName + ' ON ' + table + ' (' + field + ');';
  }

  _genRLS(tableName, def) {
    const lines = ['ALTER TABLE ' + tableName + ' ENABLE ROW LEVEL SECURITY;'];
    if (def && def.table === 'users') {
      lines.push(
        '',
        'DO $$',
        'BEGIN',
        '  IF NOT EXISTS (',
        "    SELECT 1 FROM pg_policies WHERE tablename = '" + tableName + "' AND policyname = 'Users can read own record'",
        '  ) THEN',
        '    CREATE POLICY "Users can read own record" ON ' + tableName,
        '      FOR SELECT',
        '      USING (auth.uid() = id);',
        '  END IF;',
        'END $$;',
        '',
        'DO $$',
        'BEGIN',
        '  IF NOT EXISTS (',
        "    SELECT 1 FROM pg_policies WHERE tablename = '" + tableName + "' AND policyname = 'Admins can read all users'",
        '  ) THEN',
        '    CREATE POLICY "Admins can read all users" ON ' + tableName,
        '      FOR SELECT',
        '      USING (public.is_admin_user());',
        '  END IF;',
        'END $$;',
        '',
        'DO $$',
        'BEGIN',
        '  IF NOT EXISTS (',
        "    SELECT 1 FROM pg_policies WHERE tablename = '" + tableName + "' AND policyname = 'Authenticated users can insert'",
        '  ) THEN',
        '    CREATE POLICY "Authenticated users can insert" ON ' + tableName,
        '      FOR INSERT',
        '      WITH CHECK (true);',
        '  END IF;',
        'END $$;',
        '',
        'DO $$',
        'BEGIN',
        '  IF NOT EXISTS (',
        "    SELECT 1 FROM pg_policies WHERE tablename = '" + tableName + "' AND policyname = 'Users can update own record'",
        '  ) THEN',
        '    CREATE POLICY "Users can update own record" ON ' + tableName,
        '      FOR UPDATE',
        '      USING (auth.uid() = id)',
        '      WITH CHECK (auth.uid() = id);',
        '  END IF;',
        'END $$;',
        '',
        'DO $$',
        'BEGIN',
        '  IF NOT EXISTS (',
        "    SELECT 1 FROM pg_policies WHERE tablename = '" + tableName + "' AND policyname = 'Admins can update all users'",
        '  ) THEN',
        '    CREATE POLICY "Admins can update all users" ON ' + tableName,
        '      FOR UPDATE',
        '      USING (public.is_admin_user());',
        '  END IF;',
        'END $$;',
      );
    }
    return lines.join('\n');
  }

  _genUserTrigger() {
    const hasUsers = this._entities.some((e) => e.def.table === 'users');
    if (!hasUsers) return null;
    return [
      'CREATE OR REPLACE FUNCTION public.handle_new_user()',
      'RETURNS trigger',
      'LANGUAGE plpgsql SECURITY DEFINER SET search_path = public',
      'AS $$',
      'BEGIN',
      '  INSERT INTO public.users (',
      '    id, email, name, phone, role_label, full_access, permissions,',
      '    status, created_at, updated_at',
      '  ) VALUES (',
      '    NEW.id,',
      '    NEW.email,',
      "    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),",
      "    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),",
      "    COALESCE(NEW.raw_user_meta_data->>'role_label', NULL),",
      '    CASE',
      '      WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE full_access = true) THEN true',
      "      ELSE COALESCE((NEW.raw_user_meta_data->>'full_access')::boolean, false)",
      '    END,',
      '    COALESCE(',
      "      (SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'permissions'))),",
      '      ARRAY[]::text[]',
      '    ),',
      "    'active',",
      '    NOW(),',
      '    NOW()',
      '  );',
      '  RETURN NEW;',
      'END;',
      '$$;',
      '',
      'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;',
      'CREATE TRIGGER on_auth_user_created',
      '  AFTER INSERT ON auth.users',
      '  FOR EACH ROW',
      '  EXECUTE FUNCTION public.handle_new_user();',
    ].join('\n');
  }

  _genVersion(version) {
    return [
      'CREATE TABLE IF NOT EXISTS _schema_version (',
      '  version INTEGER NOT NULL,',
      '  applied_at TIMESTAMPTZ DEFAULT NOW(),',
      '  description TEXT,',
      '  PRIMARY KEY (version, applied_at)',
      ');',
      "INSERT INTO _schema_version (version, description) VALUES (" + version + ", 'Schema installation via Setup Wizard');",
    ].join('\n');
  }

  _genSeedData() {
    const seeds = this.schema.seedData || [];
    return seeds.map((seed) => {
      if (!seed.table || !seed.data || seed.data.length === 0) return null;
      const cols = Object.keys(seed.data[0]);
      const values = seed.data.map((row) => {
        const vals = cols.map((c) => {
          const v = row[c];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number') return v;
          return "'" + String(v).replace(/'/g, "''") + "'";
        });
        return '(' + vals.join(', ') + ')';
      });
      return 'INSERT INTO ' + seed.table + ' (' + cols.join(', ') + ') VALUES\n' + values.join(',\n') + '\nON CONFLICT DO NOTHING;';
    }).filter(Boolean);
  }
}
