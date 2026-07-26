export class SchemaMapper {
  constructor(schemas) {
    this.schemas = schemas;
  }

  getSchema(entity) {
    const schema = this.schemas[entity];
    if (!schema) throw new Error(`Unknown entity: ${entity}`);
    return schema;
  }

  columns(entity) {
    return this.getSchema(entity).columns;
  }

  table(entity) {
    return this.getSchema(entity).table;
  }

  primaryKey(entity) {
    return this.getSchema(entity).primaryKey;
  }

  hasRls(entity) {
    return !!this.getSchema(entity).rls;
  }

  rlsPolicy(entity) {
    return this.getSchema(entity).rlsPolicy;
  }

  mapToDomain(entity, dbRow) {
    if (!dbRow) return null;
    const schema = this.getSchema(entity);
    const result = {};
    for (const col of schema.columns) {
      if (col in dbRow) {
        result[this._toCamelCase(col)] = dbRow[col];
      }
    }
    return result;
  }

  mapToDb(entity, domainObj) {
    if (!domainObj) return null;
    const schema = this.getSchema(entity);
    const result = {};
    for (const col of schema.columns) {
      const camelKey = this._toCamelCase(col);
      if (camelKey in domainObj) {
        result[col] = domainObj[camelKey];
      } else if (col in domainObj) {
        result[col] = domainObj[col];
      }
    }
    return result;
  }

  _toCamelCase(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}

import { SCHEMAS } from '../models/index.js';
export const schemaMapper = new SchemaMapper(SCHEMAS);
