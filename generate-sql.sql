-- ============================================================
-- CoreX Schema Installation Script
-- THIS FILE IS THE CANONICAL SOURCE OF TRUTH for the database schema.
-- It is used as the complete installation script.
-- The dynamic SqlGenerator.js mirrors this file programmatically.
-- When adding new database objects, update BOTH this file AND
-- src/setup-wizard/SqlGenerator.js and src/schema/models/index.js
-- to keep them synchronized.
-- Generated: 2026-07-26
-- Schema Version: 2
-- ============================================================


-- ===== Helper Functions =====

CREATE OR REPLACE FUNCTION exec_sql(query_text text)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE query_text;
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.check_admin_exists()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE full_access = true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_admin_exists() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND full_access = true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon, authenticated, service_role;


-- ===== Tables =====

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT,
  role_label TEXT,
  full_access BOOLEAN NOT NULL DEFAULT false,
  permissions TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email)
);
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name)
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ===== Indexes =====

CREATE INDEX IF NOT EXISTS idx_users_name ON users (name);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);


-- ===== Row Level Security =====

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can read own record'
  ) THEN
    CREATE POLICY "Users can read own record" ON users
      FOR SELECT
      USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Admins can read all users'
  ) THEN
    CREATE POLICY "Admins can read all users" ON users
      FOR SELECT
      USING (public.is_admin_user());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Authenticated users can insert'
  ) THEN
    CREATE POLICY "Authenticated users can insert" ON users
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update own record'
  ) THEN
    CREATE POLICY "Users can update own record" ON users
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Admins can update all users'
  ) THEN
    CREATE POLICY "Admins can update all users" ON users
      FOR UPDATE
      USING (public.is_admin_user());
  END IF;
END $$;


-- ===== User Profile Trigger =====

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, name, phone, role_label, full_access, permissions,
    status, created_at, updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'role_label', NULL),
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE full_access = true) THEN true
      ELSE COALESCE((NEW.raw_user_meta_data->>'full_access')::boolean, false)
    END,
    COALESCE(
      (SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'permissions'))),
      ARRAY[]::text[]
    ),
    'active',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ===== Schema Version =====

CREATE TABLE IF NOT EXISTS _schema_version (
  version INTEGER NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  PRIMARY KEY (version, applied_at)
);
INSERT INTO _schema_version (version, description) VALUES (2, 'Schema installation via Setup Wizard');


-- ============================================================
-- Installation script complete
-- ============================================================

-- Refresh PostgREST schema cache so newly created functions and
-- tables are immediately available via the REST API (without this,
-- supabase.rpc() calls return 404 until the cache refreshes automatically,
-- which can take up to 30 seconds).
NOTIFY pgrst, 'reload schema';
