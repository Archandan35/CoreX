export const MIGRATIONS = Object.freeze([
  {
    version: 1,
    name: 'initial_schema',
    up: [
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        permissions TEXT[] DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        description TEXT,
        permissions TEXT[] DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`,
      `CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)`,
      `CREATE INDEX IF NOT EXISTS idx_roles_name ON roles (name)`,
    ],
    down: [
      `DROP TABLE IF EXISTS users`,
      `DROP TABLE IF EXISTS roles`,
      `DROP TABLE IF EXISTS settings`,
    ],
  },
]);

export class MigrationRunner {
  constructor(db) {
    this.db = db;
  }

  async currentVersion() {
    try {
      await this.db.query(`CREATE TABLE IF NOT EXISTS _migrations (version INT PRIMARY KEY, name TEXT, applied_at TIMESTAMPTZ DEFAULT NOW())`);
      const result = await this.db.query(`SELECT MAX(version) as v FROM _migrations`);
      return result[0]?.v || 0;
    } catch {
      return 0;
    }
  }

  async up(targetVersion) {
    const current = await this.currentVersion();
    const pending = MIGRATIONS.filter((m) => m.version > current && (!targetVersion || m.version <= targetVersion));

    for (const migration of pending) {
      for (const sql of migration.up) {
        await this.db.query(sql);
      }
      await this.db.query(`INSERT INTO _migrations (version, name) VALUES ($1, $2)`, [migration.version, migration.name]);
    }

    return pending.length;
  }

  async down(targetVersion) {
    const current = await this.currentVersion();
    const applied = MIGRATIONS.filter((m) => m.version <= current && (!targetVersion || m.version > targetVersion)).reverse();

    for (const migration of applied) {
      for (const sql of migration.down) {
        await this.db.query(sql);
      }
      await this.db.query(`DELETE FROM _migrations WHERE version = $1`, [migration.version]);
    }

    return applied.length;
  }
}
