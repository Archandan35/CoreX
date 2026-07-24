-- CoreX Database Installation Script
-- Generated: 2026-07-24T15:26:23.619Z
-- Schema Version: 1.3.0

-- ===== EXTENSIONS =====
CREATE EXTENSION IF NOT EXISTS "pgcrypto" CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" CASCADE;
-- ===== TABLES =====
CREATE TABLE IF NOT EXISTS users (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "password" VARCHAR(255),
  "role" VARCHAR(50) NOT NULL DEFAULT 'user',
  "permissions" TEXT[] NOT NULL DEFAULT '{}',
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  UNIQUE ("email"),
  CHECK (role IN ('user', 'admin', 'superadmin', 'owner')),
  CHECK (status IN ('active', 'inactive', 'suspended'))
);
CREATE TABLE IF NOT EXISTS roles (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(100) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "permissions" TEXT[] NOT NULL DEFAULT '{}',
  "all" BOOLEAN NOT NULL DEFAULT FALSE,
  "inherits" TEXT[] NOT NULL DEFAULT '{}',
  "system" BOOLEAN NOT NULL DEFAULT FALSE,
  "status" VARCHAR(20) NOT NULL DEFAULT 'Active',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  UNIQUE ("code"),
  CHECK (status IN ('Active', 'Inactive'))
);
CREATE TABLE IF NOT EXISTS permissions (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(100) NOT NULL,
  "label" VARCHAR(255) NOT NULL,
  "category" VARCHAR(100),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  UNIQUE ("code")
);
CREATE TABLE IF NOT EXISTS settings (
  "key" VARCHAR(255) NOT NULL,
  "value" JSONB,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("key")
);
CREATE TABLE IF NOT EXISTS audit_logs (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "action" VARCHAR(100) NOT NULL,
  "module" VARCHAR(100),
  "user_id" UUID NOT NULL,
  "details" JSONB,
  "ip_address" VARCHAR(45) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("user_id") REFERENCES users(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS sessions (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token" VARCHAR(500) NOT NULL,
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("user_id") REFERENCES users(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS notifications (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "body" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("user_id") REFERENCES users(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_code ON roles (code);
CREATE INDEX IF NOT EXISTS idx_roles_system ON roles (system);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions (category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at);
-- ===== FUNCTIONS =====
CREATE OR REPLACE FUNCTION is_first_install()
RETURNS BOOLEAN AS $__body_is_first_install__$
SELECT NOT EXISTS (SELECT 1 FROM public.users);
$__body_is_first_install__$ LANGUAGE sql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION has_admin_user()
RETURNS BOOLEAN AS $__body_has_admin_user__$
SELECT EXISTS (SELECT 1 FROM public.users WHERE permissions @> ARRAY['SYSTEM_ADMIN']);
$__body_has_admin_user__$ LANGUAGE sql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION check_permission(user_id UUID, required_perm VARCHAR)
RETURNS BOOLEAN AS $__body_check_permission__$
DECLARE
  user_perms TEXT[];
BEGIN
  SELECT permissions INTO user_perms FROM users WHERE id = user_id;
  RETURN user_perms @> ARRAY[required_perm::TEXT] OR user_perms @> ARRAY['*'];
END;
$__body_check_permission__$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION hash_password(plain TEXT)
RETURNS TEXT AS $__body_hash_password__$
BEGIN
  RETURN crypt(plain, gen_salt('bf'));
END;
$__body_hash_password__$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $__body_update_timestamp__$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$__body_update_timestamp__$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION function_exists(func_name TEXT)
RETURNS BOOLEAN AS $__body_function_exists__$
BEGIN
  RETURN EXISTS (SELECT 1 FROM pg_proc WHERE proname = func_name AND pronamespace = 'public'::regnamespace);
END;
$__body_function_exists__$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $__body_is_admin__$
SELECT EXISTS (
  SELECT 1 FROM public.users
  WHERE id = auth.uid()
  AND role IN ('admin', 'superadmin')
);
$__body_is_admin__$ LANGUAGE sql SECURITY DEFINER;
-- ===== TRIGGERS =====
DROP TRIGGER IF EXISTS set_updated_at ON users;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
DROP TRIGGER IF EXISTS audit_log_insert ON audit_logs;
CREATE TRIGGER audit_log_insert
  AFTER INSERT ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
-- ===== GRANTS =====
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_first_install() TO anon;
GRANT EXECUTE ON FUNCTION has_admin_user() TO anon;
GRANT EXECUTE ON FUNCTION is_admin() TO anon, authenticated;
-- ===== ROW LEVEL SECURITY =====
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ===== RLS POLICIES =====
DROP POLICY IF EXISTS users_select ON users;
CREATE POLICY users_select ON users
  FOR SELECT
  USING (auth.uid() = id OR is_admin() OR auth.role() = 'service_role');
DROP POLICY IF EXISTS users_insert ON users;
CREATE POLICY users_insert ON users
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR (auth.uid() = id));
DROP POLICY IF EXISTS users_update ON users;
CREATE POLICY users_update ON users
  FOR UPDATE
  USING (auth.uid() = id OR is_admin() OR auth.role() = 'service_role');
DROP POLICY IF EXISTS users_delete ON users;
CREATE POLICY users_delete ON users
  FOR DELETE
  USING (is_admin() OR auth.role() = 'service_role');
-- ===== VERSION METADATA =====
INSERT INTO settings (key, value) VALUES ('schema_version', to_jsonb('1.3.0'::TEXT)) ON CONFLICT (key) DO UPDATE SET value = to_jsonb('1.3.0'::TEXT);

-- Installation complete