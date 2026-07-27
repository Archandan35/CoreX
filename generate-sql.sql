-- ============================================================
-- CoreX Schema Installation Script
-- THIS FILE IS THE CANONICAL SOURCE OF TRUTH for the database schema.
-- It is used as the complete installation script.
-- The dynamic SqlGenerator.js mirrors this file programmatically.
-- When adding new database objects, update BOTH this file AND
-- src/setup-wizard/SqlGenerator.js and src/schema/models/index.js
-- to keep them synchronized.
-- Generated: 2026-07-26
-- Schema Version: 4
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


-- ===== Invoice Domain =====
-- Provider-agnostic billing tables. All carry created_by and are RLS
-- protected: a user sees only rows they own; full_access admins see all.
-- `is_admin_user()` is the SECURITY DEFINER helper defined above and is
-- reused here so policies never recurse into RLS themselves.

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  gstin TEXT,
  billing_address TEXT,
  shipping_address TEXT,
  state TEXT,
  city TEXT,
  postal_code TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  description TEXT,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  unit TEXT,
  hsn_code TEXT,
  is_service BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  account_name TEXT,
  account_number TEXT,
  ifsc TEXT,
  branch TEXT,
  upi_id TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT,
  image_url TEXT,
  signer_name TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  prefix TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  reference TEXT,
  custom_headers JSONB,
  notes JSONB,
  terms JSONB,
  attachments JSONB,
  reverse_charge BOOLEAN NOT NULL DEFAULT false,
  create_ewaybill BOOLEAN NOT NULL DEFAULT false,
  create_einvoice BOOLEAN NOT NULL DEFAULT false,
  tds_enabled BOOLEAN NOT NULL DEFAULT false,
  tcs_enabled BOOLEAN NOT NULL DEFAULT false,
  extra_discount_type TEXT,
  extra_discount_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  round_off BOOLEAN NOT NULL DEFAULT true,
  bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL,
  signature_id UUID REFERENCES public.signatures(id) ON DELETE SET NULL,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  taxable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  additional_charges_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  show_description BOOLEAN NOT NULL DEFAULT false,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_date DATE DEFAULT CURRENT_DATE,
  mode TEXT,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON public.invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON public.products(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers(created_by);

-- ===== Invoice Domain Row Level Security =====
-- Owner-scoped policies: a user manages only their own rows; full_access
-- admins manage all. `is_admin_user()` bypasses RLS internally to avoid
-- infinite recursion. FORCE is applied so policies cover the owner column
-- on INSERT/UPDATE as well.

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read"  ON public.customers FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner write" ON public.customers FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner update" ON public.customers FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner delete" ON public.customers FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner read"  ON public.product_categories FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner write" ON public.product_categories FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner update" ON public.product_categories FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner delete" ON public.product_categories FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner read"  ON public.products FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner write" ON public.products FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner update" ON public.products FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner delete" ON public.products FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner read"  ON public.banks FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner write" ON public.banks FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner update" ON public.banks FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner delete" ON public.banks FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner read"  ON public.signatures FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner write" ON public.signatures FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner update" ON public.signatures FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner delete" ON public.signatures FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner read"  ON public.invoices FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner write" ON public.invoices FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner update" ON public.invoices FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner delete" ON public.invoices FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Invoice children inherit visibility through their parent invoice. A row is
-- accessible if the invoice it belongs to is owned by the user or the user is
-- an admin. Writes must target an invoice the user owns.
DO $$ BEGIN
  CREATE POLICY "Owner read"  ON public.invoice_items FOR SELECT USING (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner write" ON public.invoice_items FOR INSERT WITH CHECK (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner update" ON public.invoice_items FOR UPDATE USING (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid())) WITH CHECK (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner delete" ON public.invoice_items FOR DELETE USING (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner read"  ON public.invoice_payments FOR SELECT USING (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner write" ON public.invoice_payments FOR INSERT WITH CHECK (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner update" ON public.invoice_payments FOR UPDATE USING (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid())) WITH CHECK (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner delete" ON public.invoice_payments FOR DELETE USING (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ===== Schema Version =====

CREATE TABLE IF NOT EXISTS _schema_version (
  version INTEGER NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  PRIMARY KEY (version, applied_at)
);
INSERT INTO _schema_version (version, description) VALUES (4, 'Schema installation via Setup Wizard');


-- ============================================================
-- Installation script complete
-- ============================================================

-- Refresh PostgREST schema cache so newly created functions and
-- tables are immediately available via the REST API (without this,
-- supabase.rpc() calls return 404 until the cache refreshes automatically,
-- which can take up to 30 seconds).
NOTIFY pgrst, 'reload schema';
