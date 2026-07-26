export class SchemaRegistry {
  constructor() {
    this._schemas = new Map();
    this._versions = new Map();
  }

  register(name, schema) {
    const version = schema.version || 1;
    const key = `${name}@${version}`;
    this._schemas.set(key, schema);
    if (!this._versions.has(name)) this._versions.set(name, []);
    const versions = this._versions.get(name);
    if (!versions.includes(version)) versions.push(version);
  }

  get(name, version) {
    if (version) return this._schemas.get(`${name}@${version}`);
    const versions = this._versions.get(name);
    if (!versions || versions.length === 0) return null;
    return this._schemas.get(`${name}@${versions[versions.length - 1]}`);
  }

  getLatest(name) {
    return this.get(name);
  }

  getVersions(name) {
    return this._versions.get(name) || [];
  }

  has(name, version) {
    return this._schemas.has(`${name}@${version || this._getLatestVersion(name)}`);
  }

  list() {
    return Array.from(this._schemas.keys());
  }

  _getLatestVersion(name) {
    const versions = this._versions.get(name);
    return versions ? versions[versions.length - 1] : 1;
  }

  migrate(fromVersion, toVersion, data) {
    const name = data._schema;
    if (!name) return data;
    let current = data;
    for (let v = fromVersion; v < toVersion; v++) {
      const nextSchema = this._schemas.get(`${name}@${v + 1}`);
      if (nextSchema?.migrate) {
        current = nextSchema.migrate(current);
      }
    }
    return current;
  }
}

export const schemaRegistry = new SchemaRegistry();
