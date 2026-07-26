const STATEMENT_SEPARATOR = '\n\n';

export class SqlGenerator {
  constructor(schema) {
    this.schema = schema;
    this._entities = this._collectEntities();
  }

  _collectEntities() {
    const entities = [];
    for (const [key, def] of Object.entries(this.schema)) {
      if (!def || typeof def !== 'object' || !def.table) continue;
      entities.push({ key, def });
    }
    return entities;
  }

  generate(report) {
    const missing = report.missing || [];
    const issues = report.issues || [];

    const toCreate = missing.filter((i) => i.exists === false || i.status === 'missing');
    const toFix = issues.filter((i) => i.status === 'mismatch');

    this._usedDefaults = new Set();
    this._usedUnique = new Set();

    const blocks = [];
    blocks.push(this._header());

    const extensions = toCreate.filter((i) => i.type === 'extension');
    if (extensions.length > 0) {
      blocks.push(this._section('Extensions', extensions.map((e) => this._genExtension(e))));
    }

    const tables = toCreate.filter((i) => i.type === 'table');
    if (tables.length > 0) {
      blocks.push(this._section('Tables', tables.map((t) => this._genTable(t))));
    }

    const allTableNames = new Set(
      [...this._entities.map((e) => e.def.table), ...tables.map((t) => t.name)]
    );

    const createdTableNames = new Set(tables.map((t) => t.name));
    const columns = toCreate.filter(
      (i) => (i.type === 'column' || (i.column && !i.type)) && !createdTableNames.has(i.table)
    );
    const tableColumns = {};
    for (const col of columns) {
      if (!tableColumns[col.table]) tableColumns[col.table] = [];
      tableColumns[col.table].push(col);
    }
    if (Object.keys(tableColumns).length > 0) {
      const colBlocks = [];
      for (const [tbl, cols] of Object.entries(tableColumns)) {
        for (const col of cols) {
          colBlocks.push(this._genColumn(tbl, col));
        }
      }
      blocks.push(this._section('Columns', colBlocks));
    }

    const constraints = toCreate.filter((i) => i.type === 'constraint' || i.constraint);
    const missingConstraints = constraints.filter((i) => !i.exists);
    if (missingConstraints.length > 0) {
      blocks.push(this._section('Constraints', missingConstraints.map((c) => this._genConstraint(c))));
    }

    for (const entity of this._entities) {
      if (entity.def.unique) {
        for (const [col, label] of Object.entries(entity.def.unique)) {
          if (this._usedUnique.has(col)) continue;
          this._usedUnique.add(col);
          const keyName = `${entity.def.table}_${col}_key`;
          const already = constraints.some((c) => c.constraint === keyName);
          if (!already && allTableNames.has(entity.def.table)) {
            missingConstraints.push({
              table: entity.def.table,
              constraint: keyName,
              type: 'UNIQUE',
              column: col,
              exists: false,
            });
          }
        }
      }
    }

    const indexes = toCreate.filter((i) => i.type === 'index' || i.index);
    const indexBlocks = indexes.map((ix) => this._genIndex(ix));
    for (const entity of this._entities) {
      const def = entity.def;
      if (def.searchableFields && (tables.some((t) => t.name === def.table) || allTableNames.has(def.table))) {
        for (const field of def.searchableFields) {
          const idxName = `idx_${def.table}_${field}`;
          if (!indexes.some((ix) => (ix.index || ix.name) === idxName)) {
            indexBlocks.push(`CREATE INDEX IF NOT EXISTS ${idxName} ON ${def.table} (${field});`);
          }
        }
      }
    }
    if (indexBlocks.length > 0) {
      blocks.push(this._section('Indexes', indexBlocks));
    }

    for (const entity of this._entities) {
      if (entity.def.rls) {
        const rlsBlock = this._genRLS(entity.def.table, entity.def);
        if (rlsBlock) {
          blocks.push(this._section('Row Level Security', [rlsBlock]));
        }
      }
    }

    const userTrigger = this._genUserTrigger();
    if (userTrigger) {
      blocks.push(this._section('User Profile Trigger', [userTrigger]));
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

    return blocks.filter(Boolean).join(STATEMENT_SEPARATOR);
  }

  generateFullSchema() {
    this._usedDefaults = new Set();
    this._usedUnique = new Set();

    const blocks = [];
    blocks.push(this._header());

    if (this.schema.extensions && this.schema.extensions.length > 0) {
      blocks.push(this._section('Extensions', this.schema.extensions.map((e) => this._genExtension({ name: e }))));
    }

    const tableBlocks = [];
    for (const entity of this._entities) {
      tableBlocks.push(this._genTable({ name: entity.def.table, _def: entity.def }));
    }
    if (tableBlocks.length > 0) {
      blocks.push(this._section('Tables', tableBlocks));
    }

    const constraintBlocks = [];
    for (const entity of this._entities) {
      const def = entity.def;
      if (def.unique) {
        for (const [col] of Object.entries(def.unique)) {
          if (this._usedUnique.has(col)) continue;
          this._usedUnique.add(col);
          constraintBlocks.push(`ALTER TABLE ${def.table} ADD CONSTRAINT ${def.table}_${col}_key UNIQUE (${col});`);
        }
      }
    }
    if (constraintBlocks.length > 0) {
      blocks.push(this._section('Constraints', constraintBlocks));
    }

    const indexBlocks = [];
    for (const entity of this._entities) {
      const def = entity.def;
      if (def.searchableFields) {
        for (const field of def.searchableFields) {
          indexBlocks.push(`CREATE INDEX IF NOT EXISTS idx_${def.table}_${field} ON ${def.table} (${field});`);
        }
      }
    }
    if (indexBlocks.length > 0) {
      blocks.push(this._section('Indexes', indexBlocks));
    }

    for (const entity of this._entities) {
      if (entity.def.rls) {
        const rls = this._genRLS(entity.def.table, entity.def);
        if (rls) {
          blocks.push(this._section('Row Level Security', [rls]));
        }
      }
    }

    const userTrigger = this._genUserTrigger();
    if (userTrigger) {
      blocks.push(this._section('User Profile Trigger', [userTrigger]));
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

    return blocks.filter(Boolean).join(STATEMENT_SEPARATOR);
  }

  _header() {
    const lines = [
      '-- ============================================================',
      `-- CoreX Schema Installation Script`,
      `-- Generated: ${new Date().toISOString().split('T')[0]}`,
      `-- Schema Version: ${this.schema.version || 1}`,
      '-- ============================================================',
      '',
    ];
    return lines.join('\n');
  }

  _footer() {
    const lines = [
      '',
      '-- ============================================================',
      '-- Installation script complete',
      '-- ============================================================',
    ];
    return lines.join('\n');
  }

  _section(title, statements) {
    if (!statements || statements.length === 0) return null;
    const lines = [
      '',
      `-- ===== ${title} =====`,
      '',
      ...statements.filter(Boolean),
    ];
    return lines.join('\n');
  }

  _genExtension(item) {
    return `CREATE EXTENSION IF NOT EXISTS "${item.name}";`;
  }

  _genTable(item) {
    const def = item._def || Object.values(this.schema).find(
      (d) => (d.table || '') === item.name
    );
    if (!def) return `-- Missing table definition for: ${item.name}`;

    const tableName = def.table || item.name;
    const colDefs = def.columns.map((col) => {
      const type = def.columnTypes?.[col] || 'TEXT';
      const parts = [`  ${col} ${type}`];
      if (def.primaryKey === col) parts.push('PRIMARY KEY');
      if (!def.nullable?.includes(col)) parts.push('NOT NULL');
      if (def.defaults?.[col]) {
        parts.push(`DEFAULT ${def.defaults[col]}`);
        this._usedDefaults.add(col);
      }
      return parts.join(' ');
    });
    if (def.unique) {
      for (const [col] of Object.entries(def.unique)) {
        colDefs.push(`  UNIQUE (${col})`);
        this._usedUnique.add(col);
      }
    }

    return `CREATE TABLE IF NOT EXISTS ${tableName} (\n${colDefs.join(',\n')}\n);`;
  }

  _genColumn(tableName, item) {
    const def = Object.values(this.schema).find((d) => (d.table || '') === tableName);
    const col = item.column;
    const type = def?.columnTypes?.[col] || 'TEXT';
    let sql = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${col} ${type}`;
    if (def && !def.nullable?.includes(col)) sql += ' NOT NULL';
    if (def?.defaults?.[col]) sql += ` DEFAULT ${def.defaults[col]}`;
    return sql + ';';
  }

  _genConstraint(item) {
    const table = item.table;
    const name = item.constraint;
    if (item.type === 'PRIMARY KEY' || name?.startsWith('PK_')) {
      return `ALTER TABLE ${table} ADD PRIMARY KEY (${item.column || 'id'});`;
    }
    if (item.type === 'UNIQUE' || name?.includes('_key')) {
      const col = item.column || 'email';
      return `ALTER TABLE ${table} ADD CONSTRAINT ${table}_${col}_key UNIQUE (${col});`;
    }
    return `ALTER TABLE ${table} ADD CONSTRAINT ${name} UNIQUE (${item.column || 'id'});`;
  }

  _genIndex(item) {
    const table = item.table;
    const field = item.field || item.column || 'id';
    const idxName = item.index || `idx_${table}_${field}`;
    return `CREATE INDEX IF NOT EXISTS ${idxName} ON ${table} (${field});`;
  }

  _genRLS(tableName, def) {
    const lines = [
      `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`,
    ];
    if (def && def.table === 'users') {
      lines.push(
        `DO $$`,
        `BEGIN`,
        `  IF NOT EXISTS (`,
        `    SELECT 1 FROM pg_policies WHERE tablename = '${tableName}' AND policyname = 'Users can read own record'`,
        `  ) THEN`,
        `    CREATE POLICY "Users can read own record" ON ${tableName}`,
        `      FOR SELECT`,
        `      USING (auth.uid() = id);`,
        `  END IF;`,
        `END $$;`,
        ``,
        `DO $$`,
        `BEGIN`,
        `  IF NOT EXISTS (`,
        `    SELECT 1 FROM pg_policies WHERE tablename = '${tableName}' AND policyname = 'Admins can read all users'`,
        `  ) THEN`,
        `    CREATE POLICY "Admins can read all users" ON ${tableName}`,
        `      FOR SELECT`,
        `      USING (auth.uid() IN (SELECT id FROM ${tableName} WHERE full_access = true));`,
        `  END IF;`,
        `END $$;`,
        ``,
        `DO $$`,
        `BEGIN`,
        `  IF NOT EXISTS (`,
        `    SELECT 1 FROM pg_policies WHERE tablename = '${tableName}' AND policyname = 'Authenticated users can insert'`,
        `  ) THEN`,
        `    CREATE POLICY "Authenticated users can insert" ON ${tableName}`,
        `      FOR INSERT`,
        `      WITH CHECK (true);`,
        `  END IF;`,
        `END $$;`,
        ``,
        `DO $$`,
        `BEGIN`,
        `  IF NOT EXISTS (`,
        `    SELECT 1 FROM pg_policies WHERE tablename = '${tableName}' AND policyname = 'Users can update own record'`,
        `  ) THEN`,
        `    CREATE POLICY "Users can update own record" ON ${tableName}`,
        `      FOR UPDATE`,
        `      USING (auth.uid() = id)`,
        `      WITH CHECK (auth.uid() = id);`,
        `  END IF;`,
        `END $$;`,
        ``,
        `DO $$`,
        `BEGIN`,
        `  IF NOT EXISTS (`,
        `    SELECT 1 FROM pg_policies WHERE tablename = '${tableName}' AND policyname = 'Admins can update all users'`,
        `  ) THEN`,
        `    CREATE POLICY "Admins can update all users" ON ${tableName}`,
        `      FOR UPDATE`,
        `      USING (auth.uid() IN (SELECT id FROM ${tableName} WHERE full_access = true));`,
        `  END IF;`,
        `END $$;`,
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
      "LANGUAGE plpgsql SECURITY DEFINER SET search_path = public",
      'AS $$',
      'BEGIN',
      '  INSERT INTO public.users (',
      '    id, email, name, phone, role_label, full_access, permissions,',
      '    status, created_at, updated_at',
      '  ) VALUES (',
      "    NEW.id,",
      "    NEW.email,",
      "    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),",
      "    COALESCE(NEW.raw_user_meta_data->>'phone', ''),",
      "    COALESCE(NEW.raw_user_meta_data->>'role_label', ''),",
      "    COALESCE((NEW.raw_user_meta_data->>'full_access')::boolean, false),",
      "    COALESCE((NEW.raw_user_meta_data->>'permissions')::jsonb, '[]'::jsonb),",
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
      `CREATE TABLE IF NOT EXISTS _schema_version (`,
      `  version INTEGER NOT NULL,`,
      `  applied_at TIMESTAMPTZ DEFAULT NOW(),`,
      `  description TEXT,`,
      `  PRIMARY KEY (version, applied_at)`,
      `);`,
      `INSERT INTO _schema_version (version, description) VALUES (${version}, 'Schema installation via Setup Wizard');`,
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
          return `'${String(v).replace(/'/g, "''")}'`;
        });
        return `(${vals.join(', ')})`;
      });
      return `INSERT INTO ${seed.table} (${cols.join(', ')}) VALUES\n${values.join(',\n')}\nON CONFLICT DO NOTHING;`;
    }).filter(Boolean);
  }
}
