import DatabaseScanner from './DatabaseScanner.js';
import MANIFEST, { getTable, getFunction, getTrigger, getPolicy } from './SchemaManifest.js';

function describeExpected(type, name) {
  const lookup = {
    table: getTable,
    function: getFunction,
    trigger: getTrigger,
    policy: getPolicy,
  };
  if (type === 'index') {
    for (const table of MANIFEST.tables) {
      const idx = table.indexes.find(i => i.name === name);
      if (idx) return JSON.stringify({ table: table.name, columns: idx.columns }, null, 2);
    }
    return null;
  }
  if (type === 'column') {
    const [tableName, colName] = name.split('.');
    const table = getTable(tableName);
    const col = table?.columns.find(c => c.name === colName);
    return col ? JSON.stringify({ table: tableName, column: colName, type: col.type }, null, 2) : null;
  }
  const fn = lookup[type];
  if (!fn) return null;
  const def = fn(name);
  return def ? JSON.stringify(def, null, 2) : null;
}

function suggestResolution(type, name) {
  const suggestions = {
    table: `Run the setup SQL to create table "${name}"`,
    function: `Run the setup SQL to create function "${name}"`,
    trigger: `Verify table "${name === 'set_updated_at' ? 'users' : 'audit_logs'}" and function "update_timestamp" exist`,
    policy: `Verify table "${name === 'users_select_own' ? 'users' : 'users'}" exists`,
    index: `Run the setup SQL to create index "${name}"`,
    column: `Run the setup SQL to add the missing column "${name.split('.')[1]}" to table "${name.split('.')[0]}"`,
  };
  return suggestions[type] || `Re-run the installation SQL script`;
}

function buildIssue(type, name) {
  const expected = describeExpected(type, name);
  return {
    severity: type === 'table' || type === 'function' || type === 'column' ? 'error' : 'warning',
    component: name,
    type,
    message: `${type.charAt(0).toUpperCase() + type.slice(1)} "${name}" not found`,
    objectType: type,
    objectName: name,
    expectedDefinition: expected,
    actualDefinition: null,
    reason: type === 'column'
      ? `The column "${name.split('.')[1]}" was not found in table "${name.split('.')[0]}"`
      : `The ${type} "${name}" was not detected in the database after installation`,
    suggestedResolution: suggestResolution(type, name),
  };
}

export default class VerificationEngine {
  _getMissingScanResult() {
    const allNames = MANIFEST.tables.map(t => t.name);
    const missingSet = {
      tables: new Set(allNames),
      functions: new Set(MANIFEST.functions.map(f => f.name)),
      triggers: new Set(MANIFEST.triggers.map(t => t.name)),
      policies: new Set(MANIFEST.rlsPolicies.map(p => p.name)),
      indexes: MANIFEST.tables.flatMap(t => t.indexes.map(i => i.name)),
      columns: MANIFEST.tables.flatMap(t => t.columns.map(c => `${t.name}.${c.name}`)),
    };

    return {
      provider: 'postgresql',
      schemaVersion: MANIFEST.version,
      extensions: MANIFEST.extensions.map(e => e.name),
      existing: { tables: [], functions: [], triggers: [], policies: [], indexes: [], columns: [] },
      missing: {
        tables: Array.from(missingSet.tables),
        functions: Array.from(missingSet.functions),
        triggers: Array.from(missingSet.triggers),
        policies: Array.from(missingSet.policies),
        indexes: missingSet.indexes || [],
        columns: missingSet.columns || [],
      },
      totalComponents: allNames.length +
                       MANIFEST.functions.length +
                       MANIFEST.triggers.length +
                       MANIFEST.rlsPolicies.length +
                       MANIFEST.tables.reduce((a, t) => a + t.indexes.length, 0) +
                       MANIFEST.tables.reduce((a, t) => a + t.columns.length, 0),
      installedComponents: 0,
    };
  }

  async verify(config) {
    const scanner = new DatabaseScanner();
    let scan = await scanner.scan(config);

    const { default: SqlGenerator } = await import('./SqlGenerator.js');
    const generator = new SqlGenerator();

    if (scan.provider === 'postgresql' && (scan.missing.tables.length > 0 || scan.missing.columns.length > 0)) {
      const missingScanResult = this._getMissingScanResult();
      const generatedSql = generator.generate({ missing: missingScanResult });

      scan = {
        ...scan,
        missing: missingScanResult,
        sqlScript: generatedSql,
      };
    }

    const issues = [];
    const missing = scan.missing;

    for (const table of missing.tables) issues.push(buildIssue('table', table));
    for (const func of missing.functions) issues.push(buildIssue('function', func));
    for (const trigger of missing.triggers) issues.push(buildIssue('trigger', trigger));
    for (const policy of missing.policies) issues.push(buildIssue('policy', policy));
    for (const index of missing.indexes) issues.push(buildIssue('index', index));
    for (const column of missing.columns) issues.push(buildIssue('column', column));

    const totalChecks = scan.totalComponents;
    const failedChecks = issues.length;

    return {
      passed: failedChecks === 0,
      totalChecks,
      failedChecks,
      passedChecks: totalChecks - failedChecks,
      score: totalChecks > 0 ? Math.round(((totalChecks - failedChecks) / totalChecks) * 100) : 100,
      issues,
      summary: failedChecks === 0
        ? 'All checks passed. The database schema is complete.'
        : `${failedChecks} issue(s) found. Review the details below and re-run the installation SQL if needed.`,
      scan,
      manifestVersion: MANIFEST.version,
    };
  }
}
