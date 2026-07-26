export class SchemaTranslator {
  constructor() {
    this.typeMap = {
      string: { postgres: 'TEXT', sqlite: 'TEXT', memory: 'TEXT' },
      number: { postgres: 'INTEGER', sqlite: 'INTEGER', memory: 'INTEGER' },
      boolean: { postgres: 'BOOLEAN', sqlite: 'INTEGER', memory: 'BOOLEAN' },
      date: { postgres: 'TIMESTAMPTZ', sqlite: 'TEXT', memory: 'TEXT' },
      json: { postgres: 'JSONB', sqlite: 'TEXT', memory: 'TEXT' },
      uuid: { postgres: 'UUID', sqlite: 'TEXT', memory: 'TEXT' },
      array: { postgres: 'TEXT[]', sqlite: 'TEXT', memory: 'TEXT' },
    };
  }

  translate(type, dialect) {
    return this.typeMap[type]?.[dialect] || this.typeMap.string[dialect];
  }

  columnDef(name, type, dialect, options = {}) {
    const sqlType = this.translate(type, dialect);
    let def = `${name} ${sqlType}`;
    if (options.primaryKey) def += ' PRIMARY KEY';
    if (options.unique) def += ' UNIQUE';
    if (options.notNull) def += ' NOT NULL';
    if (options.default !== undefined) {
      def += ` DEFAULT ${typeof options.default === 'string' ? `'${options.default}'` : options.default}`;
    }
    if (options.references) {
      def += ` REFERENCES ${options.references.table} (${options.references.column})`;
      if (options.references.onDelete) def += ` ON DELETE ${options.references.onDelete}`;
    }
    return def;
  }
}

export const schemaTranslator = new SchemaTranslator();
