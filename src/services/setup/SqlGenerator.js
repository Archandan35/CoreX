import MANIFEST, { getTable, getFunction, getTrigger, getPolicy, getAllNames, resolveDependencyOrder } from './SchemaManifest.js';

export default class SqlGenerator {
  static generateFull() {
    const allNames = getAllNames();
    const fullScanResult = {
      missing: {
        tables: [...allNames.tables],
        functions: [...allNames.functions],
        triggers: [...allNames.triggers],
        policies: [...allNames.policies],
        indexes: [...allNames.indexes],
        columns: [...allNames.columns],
      },
    };
    return new SqlGenerator().generate(fullScanResult);
  }

  generate(scanResult) {
    const lines = [];
    lines.push(`-- ${MANIFEST.appName} Database Installation Script`);
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push(`-- Schema Version: ${MANIFEST.version}`);
    lines.push('');

    const missing = scanResult?.missing || { tables: [], functions: [], triggers: [], policies: [], indexes: [], columns: [] };
    const missingSet = {
      tables: new Set(missing.tables),
      functions: new Set(missing.functions),
      triggers: new Set(missing.triggers),
      policies: new Set(missing.policies),
      indexes: new Set(missing.indexes),
      columns: new Set(missing.columns),
    };

    const totalMissing = Object.values(missing).reduce((a, b) => a + b.length, 0);
    if (totalMissing === 0) {
      lines.push('-- Database is already fully installed. No changes needed.');
      lines.push('');
      return lines.join('\n');
    }

    const hasMissing = (type, name) => missingSet[type]?.has(name);

    const order = resolveDependencyOrder();
    const seenSection = new Set();

    for (const item of order) {
      if (item.type === 'extension') {
        if (!seenSection.has('extensions')) {
          seenSection.add('extensions');
          lines.push('-- ===== EXTENSIONS =====');
        }
        lines.push(this._createExtension(item.def));
        continue;
      }

      if (item.type === 'table' && hasMissing('tables', item.name)) {
        if (!seenSection.has('tables')) {
          seenSection.add('tables');
          lines.push('-- ===== TABLES =====');
        }
        lines.push(this._createTable(item.def));
        continue;
      }

      if (item.type === 'index' && hasMissing('indexes', item.name)) {
        if (!seenSection.has('indexes')) {
          seenSection.add('indexes');
          lines.push('-- ===== INDEXES =====');
        }
        lines.push(this._createIndex(item.def));
        continue;
      }

      if (item.type === 'column' && hasMissing('columns', item.name)) {
        const [tableName, colName] = item.name.split('.');
        if (missingSet.tables?.has(tableName)) continue;
        if (!seenSection.has('columns')) {
          seenSection.add('columns');
          lines.push('-- ===== MISSING COLUMNS (ALTER TABLE) =====');
        }
        const tableDef = getTable(tableName);
        const colDef = tableDef?.columns.find(c => c.name === colName);
        if (colDef) {
          lines.push(this._addColumn(tableName, colDef));
        }
        continue;
      }

      if (item.type === 'function' && hasMissing('functions', item.name)) {
        if (!seenSection.has('functions')) {
          seenSection.add('functions');
          lines.push('-- ===== FUNCTIONS =====');
        }
        lines.push(this._createFunction(item.def));
        continue;
      }

      if (item.type === 'trigger' && hasMissing('triggers', item.name)) {
        if (!seenSection.has('triggers')) {
          seenSection.add('triggers');
          lines.push('-- ===== TRIGGERS =====');
        }
        lines.push(this._createTrigger(item.def));
        continue;
      }

      if (item.type === 'rlsEnable') {
        const table = item.def;
        if (hasMissing('policies', MANIFEST.rlsPolicies.find(p => p.table === table.name)?.name) || hasMissing('triggers', MANIFEST.triggers.find(t => t.table === table.name)?.name)) {
          if (!seenSection.has('rlsEnable')) {
            seenSection.add('rlsEnable');
            lines.push('-- ===== ROW LEVEL SECURITY =====');
          }
          lines.push(this._enableRls(table));
        }
        continue;
      }

      if (item.type === 'policy' && hasMissing('policies', item.name)) {
        if (!seenSection.has('policies')) {
          seenSection.add('policies');
          lines.push('-- ===== RLS POLICIES =====');
        }
        lines.push(this._createPolicy(item.def));
        continue;
      }

      if (item.type === 'grant') {
        if (!seenSection.has('grants')) {
          seenSection.add('grants');
          lines.push('-- ===== GRANTS =====');
        }
        lines.push(this._createGrant(item.def));
        continue;
      }

      if (item.type === 'metadata') {
        if (!seenSection.has('metadata')) {
          seenSection.add('metadata');
          lines.push('-- ===== VERSION METADATA =====');
        }
        lines.push(this._createMetadata(item.def));
        continue;
      }

      if (item.type === 'seedData') {
        if (!seenSection.has('seedData')) {
          seenSection.add('seedData');
          lines.push('-- ===== SEED DATA =====');
        }
        lines.push(this._createSeedData(item.def));
        continue;
      }
    }

    lines.push('');
    lines.push('-- Installation complete');
    return lines.join('\n');
  }

  _createExtension(ext) {
    return `CREATE EXTENSION IF NOT EXISTS "${ext.name}" CASCADE;`;
  }

  _quoteIdentifier(identifier) {
    return `"${identifier}"`;
  }

  _addColumn(tableName, col) {
    const quotedName = this._quoteIdentifier(col.name);
    let sql = `  ADD COLUMN IF NOT EXISTS ${quotedName} ${col.type}`;
    if (!col.nullable) sql += ' NOT NULL';
    if (col.default) sql += ` DEFAULT ${col.default}`;
    if (col.unique) sql += ` CONSTRAINT uq_${tableName}_${col.name} UNIQUE`;
    if (col.check) sql += ` CONSTRAINT ck_${tableName}_${col.name} CHECK (${col.check})`;
    if (col.references) {
      const ref = col.references;
      sql += ` REFERENCES ${ref.table}(${ref.column})`;
    }
    return `ALTER TABLE ${tableName}\n${sql};`;
  }

  _createTable(def) {
    const colDefs = [];
    const inlineConstraints = [];
    for (const col of def.columns) {
      const quotedName = this._quoteIdentifier(col.name);
      let sql = `  ${quotedName} ${col.type}`;
      if (!col.nullable) sql += ' NOT NULL';
      if (col.default) sql += ` DEFAULT ${col.default}`;
      if (col.check) inlineConstraints.push(`  CHECK (${col.check})`);
      if (col.primaryKey) inlineConstraints.push(`  PRIMARY KEY (${quotedName})`);
      if (col.unique) inlineConstraints.push(`  UNIQUE (${quotedName})`);
      if (col.references) {
        const ref = col.references;
        inlineConstraints.push(`  FOREIGN KEY (${quotedName}) REFERENCES ${ref.table}(${ref.column})`);
      }
      colDefs.push(sql);
    }
    for (const fk of def.foreignKeys) {
      inlineConstraints.push(`  FOREIGN KEY (${fk.columns.join(', ')}) REFERENCES ${fk.references.table}(${fk.references.columns.join(', ')})`);
    }
    const allLines = [...colDefs, ...inlineConstraints];
    return `CREATE TABLE IF NOT EXISTS ${def.name} (\n${allLines.join(',\n')}\n);`;
  }



  _createIndex(def) {
    const unique = def.unique ? 'UNIQUE ' : '';
    return `CREATE ${unique}INDEX IF NOT EXISTS ${def.name} ON ${def.table} (${def.columns.join(', ')});`;
  }

  _createFunction(def) {
    const params = def.params.map(p => `${p.name} ${p.type}`).join(', ');
    const security = def.security ? ` ${def.security}` : '';
    const tag = `_body_${def.name}_`;
    return `CREATE OR REPLACE FUNCTION ${def.name}(${params})
RETURNS ${def.returns} AS $_${tag}_$
${def.body}
$_${tag}_$ LANGUAGE ${def.language}${security};`;
  }

  _createTrigger(def) {
    return `DROP TRIGGER IF EXISTS ${def.name} ON ${def.table};
CREATE TRIGGER ${def.name}
  ${def.timing} ${def.event} ON ${def.table}
  FOR EACH ROW EXECUTE FUNCTION ${def.function}();`;
  }

  _enableRls(tableDef) {
    return `ALTER TABLE ${tableDef.name} ENABLE ROW LEVEL SECURITY;`;
  }

  _createPolicy(pol) {
    let sql = `DROP POLICY IF EXISTS ${pol.name} ON ${pol.table};\n`;
    sql += `CREATE POLICY ${pol.name} ON ${pol.table}\n`;
    sql += `  FOR ${pol.command}`;
    if (pol.using && pol.check) {
      sql += `\n  USING (${pol.using})\n  WITH CHECK (${pol.check})`;
    } else if (pol.using) {
      sql += `\n  USING (${pol.using})`;
    } else if (pol.check) {
      sql += `\n  WITH CHECK (${pol.check})`;
    }
    sql += ';';
    return sql;
  }

  _createGrant(def) {
    if (def.kind === 'function') {
      const params = def.params?.length > 0 ? `(${def.params.join(', ')})` : '()';
      return `GRANT ${def.type} ON FUNCTION ${def.name}${params} TO ${def.roles.join(', ')};`;
    }
    const onMap = { schema: 'SCHEMA', all_tables: 'ALL TABLES IN SCHEMA', all_sequences: 'ALL SEQUENCES IN SCHEMA' };
    const onClause = onMap[def.kind] || def.kind.toUpperCase();
    return `GRANT ${def.type} ON ${onClause} ${def.target} TO ${def.roles.join(', ')};`;
  }

  _createMetadata(meta) {
    const entries = Object.entries(meta);
    return entries.map(([key, value]) => {
      const jsonVal = typeof value === 'string' ? value : String(value);
      const safe = jsonVal.replace(/'/g, "''");
      return `INSERT INTO settings (key, value) VALUES ('${key}', to_jsonb('${safe}'::TEXT)) ON CONFLICT (key) DO UPDATE SET value = to_jsonb('${safe}'::TEXT);`;
    }).join('\n');
  }

  _createSeedData(def) {
    const tableName = def.table;
    const cols = def.columns.join(', ');
    return def.values.map(row => {
      const vals = row.map(v => {
        if (typeof v === 'string' && (v.startsWith("'") || v.endsWith('::JSONB'))) return v;
        if (typeof v === 'string' && (v.startsWith('ARRAY') || v.startsWith('NOW') || v === 'TRUE' || v === 'FALSE')) return v;
        return `'${String(v).replace(/'/g, "''")}'`;
      }).join(', ');
      return `INSERT INTO ${tableName} (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;`;
    }).join('\n');
  }
}
