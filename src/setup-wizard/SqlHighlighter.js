const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'AS',
  'ON', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'NATURAL',
  'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW', 'FUNCTION', 'TRIGGER',
  'PROCEDURE', 'IF', 'EXISTS', 'ADD', 'COLUMN', 'CONSTRAINT', 'PRIMARY', 'KEY',
  'UNIQUE', 'FOREIGN', 'REFERENCES', 'DEFAULT', 'CHECK',
  'ENABLE', 'DISABLE', 'ROW', 'LEVEL', 'SECURITY', 'POLICY',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'DELETE', 'SET',
  'BEGIN', 'COMMIT', 'ROLLBACK', 'CASCADE', 'RESTRICT', 'ACTION',
  'TYPE', 'TEXT', 'INTEGER', 'BIGINT', 'SMALLINT', 'SERIAL', 'BOOLEAN',
  'TIMESTAMP', 'TIMESTAMPTZ', 'DATE', 'UUID', 'JSON', 'JSONB',
  'ARRAY', 'NUMERIC', 'REAL', 'FLOAT', 'DOUBLE', 'PRECISION',
  'VARCHAR', 'CHAR', 'CHARACTER', 'VARYING',
  'NOW', 'TRUE', 'FALSE',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'ASC', 'DESC', 'BETWEEN', 'LIKE', 'ILIKE', 'SIMILAR',
  'ORDER', 'BY', 'GROUP', 'HAVING',
  'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT',
  'GRANT', 'REVOKE', 'TO', 'PUBLIC',
  'WITH', 'DO', 'NOTHING', 'CONFLICT', 'RETURNING',
  'LANGUAGE', 'IMMUTABLE', 'STABLE', 'VOLATILE', 'STRICT',
  'COST', 'ROWS', 'RETURNS', 'OUT', 'VARIADIC',
  'REPLACE', 'RULE', 'SCHEMA', 'OWNER',
  'TABLESPACE', 'STORAGE', 'INITIALLY', 'DEFERRED', 'IMMEDIATE',
  'DEFERRABLE', 'EXCLUDE', 'USING', 'INCLUDE',
  'MATERIALIZED', 'TEMPORARY', 'TEMP', 'RECURSIVE',
  'SECURITY', 'INVOKER', 'DEFINER', 'LEAKPROOF',
  'PARALLEL', 'UNSAFE', 'RESTRICTED', 'SAFE', 'CALLED',
  'EXTENSION', 'SERVER', 'WRAPPER', 'FOREIGN', 'MAPPING',
  'SEARCH', 'CONFIGURATION', 'DICTIONARY', 'PARSER', 'TEMPLATE',
  'OPTIONS', 'SETOF', 'NONE',
  'FOR', 'EACH', 'STATEMENT', 'EXECUTE', 'FUNCTION',
  'OLD', 'NEW', 'REFERENCING', 'PERMISSIVE', 'RESTRICTIVE',
  'ALSO', 'INSTEAD', 'EVENT',
  'COMMENT', 'VERSION', 'DESCRIPTION',
  'PRIVILEGES', 'ALL', 'USAGE', 'SELECT', 'INSERT', 'UPDATE', 'DELETE',
  'TRUNCATE', 'REFERENCES', 'TRIGGER', 'CONNECT', 'TEMPORARY',
  'RESET', 'SESSION', 'LOCAL',
  'AT', 'TIME', 'ZONE', 'CURRENT_TIMESTAMP', 'CURRENT_DATE',
  'CURRENT_TIME', 'LOCALTIME', 'LOCALTIMESTAMP',
  'OVERLAPS', 'INTERVAL', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
  'COALESCE', 'NULLIF', 'CAST',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'UPPER', 'LOWER', 'TRIM', 'LENGTH', 'SUBSTRING', 'POSITION',
  'EXTRACT', 'ABS', 'CEIL', 'CEILING', 'FLOOR', 'ROUND', 'MOD', 'POWER', 'SQRT',
  'RANDOM', 'NOW',
  'CONCAT', 'REPLACE', 'SPLIT_PART', 'STRING_AGG', 'ARRAY_AGG',
  'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE',
  'TRUE', 'FALSE', 'UNKNOWN',
];

const kwSet = new Set(SQL_KEYWORDS.map((k) => k.toUpperCase()));

export function highlightSql(sql) {
  let html = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/(--[^\n]*)/g, '<span class="sql-comment">$1</span>');

  html = html.replace(/('(?:[^']|'')*')/g, '<span class="sql-string">$1</span>');

  html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-number">$1</span>');

  html = html.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, (match) => {
    if (kwSet.has(match.toUpperCase())) {
      return `<span class="sql-keyword">${match}</span>`;
    }
    return match;
  });

  html = html.replace(/\b(\w+)(\s*\()/g, (match, name, paren) => {
    const insideKeyword = name.startsWith('<span');
    if (!insideKeyword && !kwSet.has(name.toUpperCase())) {
      return `<span class="sql-function">${name}</span>${paren}`;
    }
    return match;
  });

  return html;
}
