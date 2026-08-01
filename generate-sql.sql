-- ============================================================
-- CoreX Schema Installation Script
-- THIS FILE IS THE CANONICAL SOURCE OF TRUTH for the database schema.
-- It is used as the complete installation script.
-- The dynamic SqlGenerator.js mirrors this file programmatically.
-- When adding new database objects, update BOTH this file AND
-- src/setup-wizard/SqlGenerator.js and src/schema/models/index.js
-- to keep them synchronized.
-- Generated: 2026-07-28
-- Schema Version: 5
-- ============================================================



-- ===== Helper Functions =====

CREATE OR REPLACE FUNCTION exec_sql(query_text text)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN EXECUTE query_text LOOP
    RETURN NEXT row_to_json(rec);
  END LOOP;
  RETURN;
END;
$$;

-- Grant EXECUTE to anon, authenticated, and service_role so the function
-- is callable via Supabase REST API (without this, Supabase returns a
-- permissions error when the browser calls supabase.rpc('exec_sql', ...)).
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

-- Grant EXECUTE to anon, authenticated, and service_role so the function
-- is callable via Supabase REST API during registration flow.
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

-- Grant EXECUTE to anon, authenticated, and service_role so the function
-- is callable via Supabase REST API (used by RLS policies and verification).
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon, authenticated, service_role;


-- ===== Tables =====

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  username TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT,
  role_label TEXT,
  full_access BOOLEAN NOT NULL DEFAULT false,
  permissions TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email),
  UNIQUE (username)
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
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY NOT NULL,
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
  outstanding_balance NUMERIC NOT NULL DEFAULT 0,
  total_purchases NUMERIC NOT NULL DEFAULT 0,
  credit_limit NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS product_brands (
  id UUID PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS product_units (
  id UUID PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS product_warehouses (
  id UUID PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS product_tax_rates (
  id UUID PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  rate NUMERIC NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS product_item_groups (
  id UUID PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS product_manufacturers (
  id UUID PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  category_id UUID,
  description TEXT,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  mrp NUMERIC NOT NULL DEFAULT 0,
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  unit TEXT,
  hsn_code TEXT,
  item_code TEXT,
  item_group TEXT,
  brand TEXT,
  manufacturer TEXT,
  tax_type TEXT NOT NULL DEFAULT 'exclusive',
  is_service BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  show_online BOOLEAN NOT NULL DEFAULT false,
  not_for_sale BOOLEAN NOT NULL DEFAULT false,
  allow_negative BOOLEAN NOT NULL DEFAULT false,
  track_serial BOOLEAN NOT NULL DEFAULT false,
  track_batch BOOLEAN NOT NULL DEFAULT false,
  track_expiry BOOLEAN NOT NULL DEFAULT false,
  max_discount NUMERIC NOT NULL DEFAULT 0,
  cess NUMERIC NOT NULL DEFAULT 0,
  reorder_qty NUMERIC NOT NULL DEFAULT 0,
  stock_quantity NUMERIC NOT NULL DEFAULT 0,
  stock_alert NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY NOT NULL,
  bank_name TEXT NOT NULL,
  account_name TEXT,
  account_number TEXT,
  ifsc TEXT,
  branch TEXT,
  upi_id TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS signatures (
  id UUID PRIMARY KEY NOT NULL,
  label TEXT,
  image_url TEXT,
  signer_name TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY NOT NULL,
  invoice_number TEXT NOT NULL,
  prefix TEXT NOT NULL,
  customer_id UUID,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
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
  extra_discount_value NUMERIC NOT NULL DEFAULT 0,
  round_off BOOLEAN NOT NULL DEFAULT true,
  bank_id UUID,
  signature_id UUID,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_total NUMERIC NOT NULL DEFAULT 0,
  taxable_amount NUMERIC NOT NULL DEFAULT 0,
  cgst_total NUMERIC NOT NULL DEFAULT 0,
  sgst_total NUMERIC NOT NULL DEFAULT 0,
  igst_total NUMERIC NOT NULL DEFAULT 0,
  tax_total NUMERIC NOT NULL DEFAULT 0,
  additional_charges_total NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invoice_number)
);
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY NOT NULL,
  invoice_id UUID NOT NULL,
  product_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  show_description BOOLEAN NOT NULL DEFAULT false,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  discount_type TEXT DEFAULT 'percent',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY NOT NULL,
  invoice_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT NOW(),
  mode TEXT,
  note TEXT,
  created_by UUID,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS accounting_entries (
  id UUID PRIMARY KEY NOT NULL,
  invoice_id UUID NOT NULL,
  entry_type TEXT NOT NULL,
  account_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS document_prefixes (
  id UUID PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  doc_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS document_suffixes (
  id UUID PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  doc_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS custom_headers (
  id UUID PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  internal_key TEXT NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'text',
  options TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  visible BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 1,
  column_position INTEGER NOT NULL DEFAULT 1,
  doc_types TEXT[],
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS document_notes (
  id UUID PRIMARY KEY NOT NULL,
  doc_type TEXT,
  title TEXT,
  content TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS document_terms (
  id UUID PRIMARY KEY NOT NULL,
  doc_type TEXT,
  title TEXT,
  content TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS invoice_table_columns (
  id UUID PRIMARY KEY NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  always BOOLEAN NOT NULL DEFAULT false,
  default_visible BOOLEAN NOT NULL DEFAULT false,
  width INTEGER,
  permission TEXT,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (key)
);
CREATE TABLE IF NOT EXISTS document_settings (
  id UUID PRIMARY KEY NOT NULL,
  invoice_template TEXT NOT NULL DEFAULT 'classic',
  custom_fields_enabled BOOLEAN NOT NULL DEFAULT false,
  prefix_suffix JSONB,
  default_notes_and_terms JSONB,
  show_images BOOLEAN NOT NULL DEFAULT true,
  show_net_balance BOOLEAN NOT NULL DEFAULT true,
  show_previous_dues BOOLEAN NOT NULL DEFAULT false,
  show_due_date BOOLEAN NOT NULL DEFAULT true,
  show_dispatch_address BOOLEAN NOT NULL DEFAULT true,
  show_payments BOOLEAN NOT NULL DEFAULT true,
  show_round_off BOOLEAN NOT NULL DEFAULT true,
  show_receiver_signature BOOLEAN NOT NULL DEFAULT false,
  hide_quantity BOOLEAN NOT NULL DEFAULT false,
  show_quantity_3_decimals BOOLEAN NOT NULL DEFAULT false,
  show_quantity_conversion BOOLEAN NOT NULL DEFAULT false,
  hide_discount BOOLEAN NOT NULL DEFAULT false,
  show_discount_column BOOLEAN NOT NULL DEFAULT false,
  price_decimals TEXT NOT NULL DEFAULT '2',
  hide_hsn_sac BOOLEAN NOT NULL DEFAULT false,
  show_company_details BOOLEAN NOT NULL DEFAULT true,
  show_brand_name BOOLEAN NOT NULL DEFAULT false,
  show_hsn_sac_summary BOOLEAN NOT NULL DEFAULT false,
  hsn_sac_summary_on TEXT NOT NULL DEFAULT '+10...',
  pdf_footer TEXT,
  thermal_footer TEXT,
  header_image TEXT,
  footer_image TEXT,
  banner_image_top TEXT,
  banner_image_bottom TEXT,
  pdf_language TEXT NOT NULL DEFAULT 'English (Default)',
  pdf_font_style TEXT NOT NULL DEFAULT 'Stylish',
  pdf_font_size TEXT NOT NULL DEFAULT 'normal',
  pdf_orientation TEXT NOT NULL DEFAULT 'Portrait',
  repeat_header BOOLEAN NOT NULL DEFAULT false,
  enable_item_headers BOOLEAN NOT NULL DEFAULT false,
  show_full_page BOOLEAN NOT NULL DEFAULT false,
  show_striped_rows BOOLEAN NOT NULL DEFAULT false,
  pdf_margin_top TEXT NOT NULL DEFAULT '0',
  pdf_margin_bottom TEXT NOT NULL DEFAULT '0',
  pdf_margin_left TEXT NOT NULL DEFAULT '24',
  pdf_margin_right TEXT NOT NULL DEFAULT '24',
  show_conversion_factor BOOLEAN NOT NULL DEFAULT false,
  show_inr BOOLEAN NOT NULL DEFAULT false,
  pdf_accent_color TEXT NOT NULL DEFAULT '#3815f7e6',
  watermark TEXT,
  social_links TEXT,
  labels JSONB,
  email_template JSONB,
  whatsapp_template JSONB,
  default_due_days INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS document_type_master (
  id UUID PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  label TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name)
);



-- ===== Indexes =====

CREATE INDEX IF NOT EXISTS idx_users_name ON users (name);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers (company);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_gstin ON customers (gstin);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers (created_by);
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories (name);
CREATE INDEX IF NOT EXISTS idx_product_brands_name ON product_brands (name);
CREATE INDEX IF NOT EXISTS idx_product_units_name ON product_units (name);
CREATE INDEX IF NOT EXISTS idx_product_warehouses_name ON product_warehouses (name);
CREATE INDEX IF NOT EXISTS idx_product_tax_rates_name ON product_tax_rates (name);
CREATE INDEX IF NOT EXISTS idx_product_item_groups_name ON product_item_groups (name);
CREATE INDEX IF NOT EXISTS idx_product_manufacturers_name ON product_manufacturers (name);
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (barcode);
CREATE INDEX IF NOT EXISTS idx_products_hsn_code ON products (hsn_code);
CREATE INDEX IF NOT EXISTS idx_products_item_code ON products (item_code);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products (created_by);
CREATE INDEX IF NOT EXISTS idx_banks_bank_name ON banks (bank_name);
CREATE INDEX IF NOT EXISTS idx_banks_account_name ON banks (account_name);
CREATE INDEX IF NOT EXISTS idx_banks_account_number ON banks (account_number);
CREATE INDEX IF NOT EXISTS idx_banks_ifsc ON banks (ifsc);
CREATE INDEX IF NOT EXISTS idx_banks_upi_id ON banks (upi_id);
CREATE INDEX IF NOT EXISTS idx_signatures_label ON signatures (label);
CREATE INDEX IF NOT EXISTS idx_signatures_signer_name ON signatures (signer_name);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_reference ON invoices (reference);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices (created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_name ON invoice_items (name);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_note ON invoice_payments (note);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs (record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_invoice ON accounting_entries (invoice_id);
CREATE INDEX IF NOT EXISTS idx_document_prefixes_doc_type ON document_prefixes (doc_type);
CREATE INDEX IF NOT EXISTS idx_document_suffixes_doc_type ON document_suffixes (doc_type);
CREATE INDEX IF NOT EXISTS idx_custom_headers_active ON custom_headers (active);
CREATE INDEX IF NOT EXISTS idx_custom_headers_display_order ON custom_headers (display_order);
CREATE INDEX IF NOT EXISTS idx_document_notes_doc_type ON document_notes (doc_type);
CREATE INDEX IF NOT EXISTS idx_document_terms_doc_type ON document_terms (doc_type);
CREATE INDEX IF NOT EXISTS idx_invoice_table_columns_display_order ON invoice_table_columns (display_order);
CREATE INDEX IF NOT EXISTS idx_document_type_master_name ON document_type_master (name);


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
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON customers FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON customers FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON customers FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON customers FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON product_categories FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON product_categories FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON product_categories FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON product_categories FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE product_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_brands FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON product_brands FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON product_brands FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON product_brands FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON product_brands FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_units FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON product_units FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON product_units FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON product_units FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON product_units FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE product_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_warehouses FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON product_warehouses FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON product_warehouses FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON product_warehouses FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON product_warehouses FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE product_tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tax_rates FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON product_tax_rates FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON product_tax_rates FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON product_tax_rates FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON product_tax_rates FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE product_item_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_item_groups FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON product_item_groups FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON product_item_groups FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON product_item_groups FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON product_item_groups FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE product_manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_manufacturers FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON product_manufacturers FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON product_manufacturers FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON product_manufacturers FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON product_manufacturers FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON products FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON products FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON products FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON products FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON banks FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON banks FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON banks FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON banks FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON signatures FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON signatures FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON signatures FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON signatures FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON invoices FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON invoices FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON invoices FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON invoices FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON invoice_items FOR SELECT USING (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON invoice_items FOR INSERT WITH CHECK (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON invoice_items FOR UPDATE USING (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid())) WITH CHECK (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON invoice_items FOR DELETE USING (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON invoice_payments FOR SELECT USING (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON invoice_payments FOR INSERT WITH CHECK (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON invoice_payments FOR UPDATE USING (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid())) WITH CHECK (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON invoice_payments FOR DELETE USING (public.is_admin_user() OR invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE document_prefixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_prefixes FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON document_prefixes FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON document_prefixes FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON document_prefixes FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON document_prefixes FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE document_suffixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_suffixes FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON document_suffixes FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON document_suffixes FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON document_suffixes FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON document_suffixes FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE custom_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_headers FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON custom_headers FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON custom_headers FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON custom_headers FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON custom_headers FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE document_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_notes FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON document_notes FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON document_notes FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON document_notes FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON document_notes FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE document_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_terms FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON document_terms FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON document_terms FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON document_terms FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON document_terms FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE invoice_table_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_table_columns FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON invoice_table_columns FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON invoice_table_columns FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON invoice_table_columns FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON invoice_table_columns FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE document_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_settings FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner read" ON document_settings FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner write" ON document_settings FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner update" ON document_settings FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner delete" ON document_settings FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- ===== User Profile Trigger =====

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, name, username, phone, role_label, full_access, permissions,
    status, created_at, updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    LOWER(NEW.raw_user_meta_data->>'username'),
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


-- ===== Seed Data =====

INSERT INTO document_type_master (id, name) VALUES
  ('e15c7e40-9b2a-4f6a-9d1e-000000000001', 'Invoice'),
  ('e15c7e40-9b2a-4f6a-9d1e-000000000002', 'Purchase'),
  ('e15c7e40-9b2a-4f6a-9d1e-000000000003', 'Sales Return'),
  ('e15c7e40-9b2a-4f6a-9d1e-000000000004', 'Purchase Return'),
  ('e15c7e40-9b2a-4f6a-9d1e-000000000005', 'Purchase Order'),
  ('e15c7e40-9b2a-4f6a-9d1e-000000000006', 'Delivery Challan'),
  ('e15c7e40-9b2a-4f6a-9d1e-000000000007', 'Sales Order'),
  ('e15c7e40-9b2a-4f6a-9d1e-000000000008', 'Quotation'),
  ('e15c7e40-9b2a-4f6a-9d1e-000000000009', 'Pro Forma Invoice'),
  ('e15c7e40-9b2a-4f6a-9d1e-000000000010', 'Subscription'),
  ('e15c7e40-9b2a-4f6a-9d1e-000000000011', 'Sales Debit Note')
ON CONFLICT DO NOTHING;


-- ===== Schema Version =====

CREATE TABLE IF NOT EXISTS _schema_version (
  version INTEGER NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  PRIMARY KEY (version, applied_at)
);
INSERT INTO _schema_version (version, description)
VALUES (5, 'Schema v5: user_role_refactor (username, full_access, role_label, phone)')
ON CONFLICT DO NOTHING;


-- ============================================================
-- Installation script complete
-- ============================================================

NOTIFY pgrst, 'reload schema';