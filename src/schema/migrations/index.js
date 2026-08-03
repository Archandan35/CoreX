export const MIGRATIONS = Object.freeze([
  {
    version: 1,
    name: 'initial_schema',
    up: [
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        username TEXT,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        password_hash TEXT,
        role_label TEXT DEFAULT 'user',
        full_access BOOLEAN DEFAULT false,
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
      `CREATE INDEX IF NOT EXISTS idx_users_name ON users (name)`,
      `CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)`,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`,
      `CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone)`,
      `CREATE INDEX IF NOT EXISTS idx_roles_name ON roles (name)`,
    ],
    down: [
      `DROP TABLE IF EXISTS users`,
      `DROP TABLE IF EXISTS roles`,
      `DROP TABLE IF EXISTS settings`,
    ],
  },
  {
    version: 2,
    name: 'invoice_domain_tables',
    up: [
      `CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        company TEXT, email TEXT, phone TEXT, gstin TEXT,
        billing_address TEXT, shipping_address TEXT,
        state TEXT, city TEXT, postal_code TEXT,
        outstanding_balance NUMERIC DEFAULT 0,
        total_purchases NUMERIC DEFAULT 0,
        credit_limit NUMERIC DEFAULT 0,
        created_by UUID, created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS product_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL, created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL, sku TEXT, barcode TEXT, category_id UUID,
        description TEXT, unit_price NUMERIC DEFAULT 0, tax_rate NUMERIC DEFAULT 0,
        unit TEXT, hsn_code TEXT, is_service BOOLEAN DEFAULT false,
        stock_quantity NUMERIC DEFAULT 0, stock_alert NUMERIC DEFAULT 0,
        created_by UUID, created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS banks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bank_name TEXT NOT NULL, account_name TEXT, account_number TEXT,
        ifsc TEXT, branch TEXT, upi_id TEXT, is_default BOOLEAN DEFAULT false,
        created_by UUID, created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS signatures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label TEXT, image_url TEXT, signer_name TEXT,
        is_default BOOLEAN DEFAULT false, created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number TEXT NOT NULL, prefix TEXT, customer_id UUID,
        invoice_date DATE, due_date DATE, reference TEXT,
        custom_headers JSONB, notes JSONB, terms JSONB, attachments JSONB,
        reverse_charge BOOLEAN DEFAULT false,
        create_ewaybill BOOLEAN DEFAULT false,
        create_einvoice BOOLEAN DEFAULT false,
        tds_enabled BOOLEAN DEFAULT false, tcs_enabled BOOLEAN DEFAULT false,
        extra_discount_type TEXT, extra_discount_value NUMERIC DEFAULT 0,
        round_off BOOLEAN DEFAULT true, bank_id UUID, signature_id UUID,
        subtotal NUMERIC DEFAULT 0, discount_total NUMERIC DEFAULT 0,
        taxable_amount NUMERIC DEFAULT 0, cgst_total NUMERIC DEFAULT 0,
        sgst_total NUMERIC DEFAULT 0, igst_total NUMERIC DEFAULT 0,
        tax_total NUMERIC DEFAULT 0, additional_charges_total NUMERIC DEFAULT 0,
        grand_total NUMERIC DEFAULT 0, amount_paid NUMERIC DEFAULT 0,
        balance_due NUMERIC DEFAULT 0, status TEXT DEFAULT 'draft',
        created_by UUID, created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number)
      )`,
      `CREATE TABLE IF NOT EXISTS invoice_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID, product_id UUID,
        name TEXT NOT NULL, description TEXT, show_description BOOLEAN DEFAULT false,
        quantity NUMERIC DEFAULT 1, unit_price NUMERIC DEFAULT 0,
        tax_rate NUMERIC DEFAULT 0, discount_type TEXT DEFAULT 'percent',
        discount_value NUMERIC DEFAULT 0, discount_amount NUMERIC DEFAULT 0,
        tax_amount NUMERIC DEFAULT 0, line_total NUMERIC DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS invoice_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID, amount NUMERIC DEFAULT 0,
        payment_date DATE, mode TEXT, note TEXT, created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_company ON customers (company)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_gstin ON customers (gstin)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers (created_by)`,
      `CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories (name)`,
      `CREATE INDEX IF NOT EXISTS idx_products_name ON products (name)`,
      `CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku)`,
      `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (barcode)`,
      `CREATE INDEX IF NOT EXISTS idx_products_hsn_code ON products (hsn_code)`,
      `CREATE INDEX IF NOT EXISTS idx_products_created_by ON products (created_by)`,
      `CREATE INDEX IF NOT EXISTS idx_banks_bank_name ON banks (bank_name)`,
      `CREATE INDEX IF NOT EXISTS idx_banks_account_name ON banks (account_name)`,
      `CREATE INDEX IF NOT EXISTS idx_banks_account_number ON banks (account_number)`,
      `CREATE INDEX IF NOT EXISTS idx_banks_ifsc ON banks (ifsc)`,
      `CREATE INDEX IF NOT EXISTS idx_banks_upi_id ON banks (upi_id)`,
      `CREATE INDEX IF NOT EXISTS idx_signatures_label ON signatures (label)`,
      `CREATE INDEX IF NOT EXISTS idx_signatures_signer_name ON signatures (signer_name)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices (invoice_number)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_reference ON invoices (reference)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices (customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices (created_by)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status)`,
      `CREATE INDEX IF NOT EXISTS idx_invoice_items_name ON invoice_items (name)`,
      `CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items (invoice_id)`,
      `CREATE INDEX IF NOT EXISTS idx_invoice_payments_note ON invoice_payments (note)`,
      `CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments (invoice_id)`,
    ],
    down: [
      `DROP TABLE IF EXISTS invoice_payments`,
      `DROP TABLE IF EXISTS invoice_items`,
      `DROP TABLE IF EXISTS invoices`,
      `DROP TABLE IF EXISTS signatures`,
      `DROP TABLE IF EXISTS banks`,
      `DROP TABLE IF EXISTS products`,
      `DROP TABLE IF EXISTS product_categories`,
      `DROP TABLE IF EXISTS customers`,
    ],
  },
  {
    version: 3,
    name: 'audit_logs_and_accounting',
    up: [
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_name TEXT NOT NULL, record_id TEXT NOT NULL,
        action TEXT NOT NULL, old_values JSONB, new_values JSONB,
        changed_by UUID, ip_address TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS accounting_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL, entry_type TEXT NOT NULL,
        account_name TEXT NOT NULL, amount NUMERIC DEFAULT 0,
        description TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs (table_name, record_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_accounting_entries_invoice ON accounting_entries (invoice_id)`,
    ],
    down: [
      `DROP TABLE IF EXISTS accounting_entries`,
      `DROP TABLE IF EXISTS audit_logs`,
    ],
  },
  {
    version: 4,
    name: 'stock_and_balance_columns',
    up: [
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC DEFAULT 0`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_alert NUMERIC DEFAULT 0`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC DEFAULT 0`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_purchases NUMERIC DEFAULT 0`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0`,
    ],
    down: [
      `ALTER TABLE products DROP COLUMN IF EXISTS stock_quantity`,
      `ALTER TABLE products DROP COLUMN IF EXISTS stock_alert`,
      `ALTER TABLE customers DROP COLUMN IF EXISTS outstanding_balance`,
      `ALTER TABLE customers DROP COLUMN IF EXISTS total_purchases`,
      `ALTER TABLE customers DROP COLUMN IF EXISTS credit_limit`,
    ],
  },
  {
    version: 5,
    name: 'user_role_refactor',
    up: [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS full_access BOOLEAN DEFAULT false`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS role_label TEXT DEFAULT 'user'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)`,
      `CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone)`,
    ],
    down: [
      `ALTER TABLE users DROP COLUMN IF EXISTS username`,
      `ALTER TABLE users DROP COLUMN IF EXISTS full_access`,
      `ALTER TABLE users DROP COLUMN IF EXISTS role_label`,
      `ALTER TABLE users DROP COLUMN IF EXISTS phone`,
    ],
  },
  {
    version: 6,
    name: 'product_extra_tables',
    up: [
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer TEXT`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS item_code TEXT`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS item_group TEXT`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price NUMERIC DEFAULT 0`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_type TEXT DEFAULT 'exclusive'`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS show_online BOOLEAN DEFAULT false`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS not_for_sale BOOLEAN DEFAULT false`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_negative BOOLEAN DEFAULT false`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS track_serial BOOLEAN DEFAULT false`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS track_batch BOOLEAN DEFAULT false`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS track_expiry BOOLEAN DEFAULT false`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS max_discount NUMERIC DEFAULT 0`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS cess NUMERIC DEFAULT 0`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_qty NUMERIC DEFAULT 0`,
      `CREATE TABLE IF NOT EXISTS product_brands (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS product_units (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS product_warehouses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, location TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS product_price_lists (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, currency TEXT DEFAULT 'INR', created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS product_price_list_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES products(id) ON DELETE CASCADE, price_list_id UUID REFERENCES product_price_lists(id) ON DELETE CASCADE, selling_price NUMERIC DEFAULT 0, currency TEXT DEFAULT 'INR', effective_date DATE, expiry_date DATE, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS product_media (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES products(id) ON DELETE CASCADE, url TEXT NOT NULL, type TEXT DEFAULT 'image', sort_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS product_attachments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES products(id) ON DELETE CASCADE, url TEXT NOT NULL, name TEXT, type TEXT, size BIGINT, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS product_opening_stock (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES products(id) ON DELETE CASCADE, quantity NUMERIC DEFAULT 0, unit_price NUMERIC DEFAULT 0, total_value NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED, warehouse TEXT, batch TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS product_variants (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES products(id) ON DELETE CASCADE, name TEXT NOT NULL, sku TEXT, unit_price NUMERIC DEFAULT 0, stock_quantity NUMERIC DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS product_custom_fields (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES products(id) ON DELETE CASCADE, field_name TEXT NOT NULL, field_value TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
      `CREATE INDEX IF NOT EXISTS idx_product_media_product ON product_media (product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_product_attachments_product ON product_attachments (product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_product_opening_stock_product ON product_opening_stock (product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_product_custom_fields_product ON product_custom_fields (product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_product_price_list_items_product ON product_price_list_items (product_id)`,
    ],
    down: [
      `DROP TABLE IF EXISTS product_custom_fields`,
      `DROP TABLE IF EXISTS product_variants`,
      `DROP TABLE IF EXISTS product_opening_stock`,
      `DROP TABLE IF EXISTS product_attachments`,
      `DROP TABLE IF EXISTS product_media`,
      `DROP TABLE IF EXISTS product_price_list_items`,
      `DROP TABLE IF EXISTS product_price_lists`,
      `DROP TABLE IF EXISTS product_warehouses`,
      `DROP TABLE IF EXISTS product_units`,
      `DROP TABLE IF EXISTS product_brands`,
    ],
  },
  {
    version: 7,
    name: 'inventory_mrp_column',
    up: [
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp NUMERIC DEFAULT 0`,
    ],
    down: [
      `ALTER TABLE products DROP COLUMN IF EXISTS mrp`,
    ],
  },
  {
    version: 8,
    name: 'product_masters_refactor',
    up: [
      `ALTER TABLE product_brands ADD COLUMN IF NOT EXISTS created_by UUID`,
      `ALTER TABLE product_brands ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
      `ALTER TABLE product_units ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false`,
      `ALTER TABLE product_units ADD COLUMN IF NOT EXISTS created_by UUID`,
      `ALTER TABLE product_units ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
      `ALTER TABLE product_warehouses ADD COLUMN IF NOT EXISTS created_by UUID`,
      `ALTER TABLE product_warehouses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
      `CREATE TABLE IF NOT EXISTS product_tax_rates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        rate NUMERIC DEFAULT 0,
        is_default BOOLEAN DEFAULT false,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS product_item_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS product_manufacturers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_product_brands_name ON product_brands (name)`,
      `CREATE INDEX IF NOT EXISTS idx_product_units_name ON product_units (name)`,
      `CREATE INDEX IF NOT EXISTS idx_product_warehouses_name ON product_warehouses (name)`,
      `CREATE INDEX IF NOT EXISTS idx_product_tax_rates_name ON product_tax_rates (name)`,
      `CREATE INDEX IF NOT EXISTS idx_product_item_groups_name ON product_item_groups (name)`,
      `CREATE INDEX IF NOT EXISTS idx_product_manufacturers_name ON product_manufacturers (name)`,
      `CREATE INDEX IF NOT EXISTS idx_products_item_code ON products (item_code)`,
    ],
    down: [
      `DROP INDEX IF EXISTS idx_product_manufacturers_name`,
      `DROP INDEX IF EXISTS idx_product_item_groups_name`,
      `DROP INDEX IF EXISTS idx_product_tax_rates_name`,
      `DROP INDEX IF EXISTS idx_product_warehouses_name`,
      `DROP INDEX IF EXISTS idx_product_units_name`,
      `DROP INDEX IF EXISTS idx_product_brands_name`,
      `DROP TABLE IF EXISTS product_manufacturers`,
      `DROP TABLE IF EXISTS product_item_groups`,
      `DROP TABLE IF EXISTS product_tax_rates`,
    ],
  },
  {
    version: 9,
    name: 'document_settings_refactor',
    up: [
      `CREATE TABLE IF NOT EXISTS document_prefixes (
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
      )`,
      `CREATE TABLE IF NOT EXISTS document_suffixes (
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
      )`,
      `CREATE TABLE IF NOT EXISTS custom_headers (
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
      )`,
      `CREATE TABLE IF NOT EXISTS document_notes (
        id UUID PRIMARY KEY NOT NULL,
        doc_type TEXT,
        title TEXT,
        content TEXT,
        created_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS document_terms (
        id UUID PRIMARY KEY NOT NULL,
        doc_type TEXT,
        title TEXT,
        content TEXT,
        created_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS invoice_table_columns (
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
      )`,
      `CREATE TABLE IF NOT EXISTS document_settings (
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
      )`,
      `CREATE TABLE IF NOT EXISTS document_type_master (
        id UUID PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        label TEXT,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (name)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_document_prefixes_doc_type ON document_prefixes (doc_type)`,
      `CREATE INDEX IF NOT EXISTS idx_document_suffixes_doc_type ON document_suffixes (doc_type)`,
      `CREATE INDEX IF NOT EXISTS idx_custom_headers_active ON custom_headers (active)`,
      `CREATE INDEX IF NOT EXISTS idx_custom_headers_display_order ON custom_headers (display_order)`,
      `CREATE INDEX IF NOT EXISTS idx_document_notes_doc_type ON document_notes (doc_type)`,
      `CREATE INDEX IF NOT EXISTS idx_document_terms_doc_type ON document_terms (doc_type)`,
      `CREATE INDEX IF NOT EXISTS idx_invoice_table_columns_display_order ON invoice_table_columns (display_order)`,
      `CREATE INDEX IF NOT EXISTS idx_document_type_master_name ON document_type_master (name)`,
      `ALTER TABLE document_prefixes ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE document_prefixes FORCE ROW LEVEL SECURITY`,
      `ALTER TABLE document_suffixes ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE document_suffixes FORCE ROW LEVEL SECURITY`,
      `ALTER TABLE custom_headers ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE custom_headers FORCE ROW LEVEL SECURITY`,
      `ALTER TABLE document_notes ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE document_notes FORCE ROW LEVEL SECURITY`,
      `ALTER TABLE document_terms ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE document_terms FORCE ROW LEVEL SECURITY`,
      `ALTER TABLE invoice_table_columns ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE invoice_table_columns FORCE ROW LEVEL SECURITY`,
      `ALTER TABLE document_settings ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE document_settings FORCE ROW LEVEL SECURITY`,
      `INSERT INTO document_type_master (id, name) VALUES
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
      ON CONFLICT DO NOTHING`,
    ],
    down: [
      `DROP INDEX IF EXISTS idx_document_type_master_name`,
      `DROP INDEX IF EXISTS idx_invoice_table_columns_display_order`,
      `DROP INDEX IF EXISTS idx_document_terms_doc_type`,
      `DROP INDEX IF EXISTS idx_document_notes_doc_type`,
      `DROP INDEX IF EXISTS idx_custom_headers_display_order`,
      `DROP INDEX IF EXISTS idx_custom_headers_active`,
      `DROP INDEX IF EXISTS idx_document_suffixes_doc_type`,
      `DROP INDEX IF EXISTS idx_document_prefixes_doc_type`,
      `DROP TABLE IF EXISTS document_type_master`,
      `DROP TABLE IF EXISTS document_settings`,
      `DROP TABLE IF EXISTS invoice_table_columns`,
      `DROP TABLE IF EXISTS document_terms`,
      `DROP TABLE IF EXISTS document_notes`,
      `DROP TABLE IF EXISTS custom_headers`,
      `DROP TABLE IF EXISTS document_suffixes`,
      `DROP TABLE IF EXISTS document_prefixes`,
    ],
  },
  {
    version: 10,
    name: 'product_suppliers',
    up: [
      `CREATE TABLE IF NOT EXISTS product_suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        company TEXT,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        gstin TEXT,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID`,
      `CREATE INDEX IF NOT EXISTS idx_product_suppliers_name ON product_suppliers (name)`,
      `CREATE INDEX IF NOT EXISTS idx_product_suppliers_company ON product_suppliers (company)`,
      `CREATE INDEX IF NOT EXISTS idx_product_suppliers_email ON product_suppliers (email)`,
      `CREATE INDEX IF NOT EXISTS idx_product_suppliers_phone ON product_suppliers (phone)`,
      `CREATE INDEX IF NOT EXISTS idx_product_suppliers_gstin ON product_suppliers (gstin)`,
      `CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products (supplier_id)`,
    ],
    down: [
      `DROP INDEX IF EXISTS idx_products_supplier_id`,
      `DROP INDEX IF EXISTS idx_product_suppliers_gstin`,
      `DROP INDEX IF EXISTS idx_product_suppliers_phone`,
      `DROP INDEX IF EXISTS idx_product_suppliers_email`,
      `DROP INDEX IF EXISTS idx_product_suppliers_company`,
      `DROP INDEX IF EXISTS idx_product_suppliers_name`,
      `ALTER TABLE products DROP COLUMN IF EXISTS supplier_id`,
      `DROP TABLE IF EXISTS product_suppliers`,
    ],
  },
  {
    version: 11,
    name: 'vendor_management',
    up: [
      `ALTER TABLE product_suppliers ADD COLUMN IF NOT EXISTS category_id UUID`,
      `ALTER TABLE product_suppliers ADD COLUMN IF NOT EXISTS city TEXT`,
      `ALTER TABLE product_suppliers ADD COLUMN IF NOT EXISTS payment_terms TEXT`,
      `ALTER TABLE product_suppliers ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC DEFAULT 0`,
      `ALTER TABLE product_suppliers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`,
      `CREATE INDEX IF NOT EXISTS idx_product_suppliers_city ON product_suppliers (city)`,
      `CREATE INDEX IF NOT EXISTS idx_product_suppliers_created_by ON product_suppliers (created_by)`,
      `CREATE INDEX IF NOT EXISTS idx_product_suppliers_status ON product_suppliers (status)`,
      `CREATE INDEX IF NOT EXISTS idx_product_suppliers_category_id ON product_suppliers (category_id)`,
      `CREATE TABLE IF NOT EXISTS supplier_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_supplier_categories_name ON supplier_categories (name)`,
      `ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE supplier_categories FORCE ROW LEVEL SECURITY`,
      `DO $$ BEGIN CREATE POLICY "Owner read" ON supplier_categories FOR SELECT USING (public.is_admin_user() OR created_by = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE POLICY "Owner write" ON supplier_categories FOR INSERT WITH CHECK (public.is_admin_user() OR created_by = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE POLICY "Owner update" ON supplier_categories FOR UPDATE USING (public.is_admin_user() OR created_by = auth.uid()) WITH CHECK (public.is_admin_user() OR created_by = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE POLICY "Owner delete" ON supplier_categories FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `INSERT INTO supplier_categories (id, name) VALUES
        ('e15c7e40-9b2a-4f6a-9d1e-000000000101', 'Groceries'),
        ('e15c7e40-9b2a-4f6a-9d1e-000000000102', 'Dairy Products'),
        ('e15c7e40-9b2a-4f6a-9d1e-000000000103', 'Beverages'),
        ('e15c7e40-9b2a-4f6a-9d1e-000000000104', 'General'),
        ('e15c7e40-9b2a-4f6a-9d1e-000000000105', 'Snacks'),
        ('e15c7e40-9b2a-4f6a-9d1e-000000000106', 'Home Care'),
        ('e15c7e40-9b2a-4f6a-9d1e-000000000107', 'Personal Care')
       ON CONFLICT DO NOTHING`,
    ],
    down: [
      `DROP INDEX IF EXISTS idx_supplier_categories_name`,
      `DROP TABLE IF EXISTS supplier_categories`,
      `DROP INDEX IF EXISTS idx_product_suppliers_category_id`,
      `DROP INDEX IF EXISTS idx_product_suppliers_status`,
      `DROP INDEX IF EXISTS idx_product_suppliers_created_by`,
      `DROP INDEX IF EXISTS idx_product_suppliers_city`,
      `ALTER TABLE product_suppliers DROP COLUMN IF EXISTS status`,
      `ALTER TABLE product_suppliers DROP COLUMN IF EXISTS outstanding_amount`,
      `ALTER TABLE product_suppliers DROP COLUMN IF EXISTS payment_terms`,
      `ALTER TABLE product_suppliers DROP COLUMN IF EXISTS city`,
      `ALTER TABLE product_suppliers DROP COLUMN IF EXISTS category_id`,
    ],
  },
]);

export class MigrationRunner {
  constructor(db) {
    this.db = db;
  }

  async currentVersion() {
    try {
      await this.db.query(`CREATE TABLE IF NOT EXISTS _schema_version (version INT PRIMARY KEY, name TEXT, applied_at TIMESTAMPTZ DEFAULT NOW())`);
      const result = await this.db.query(`SELECT MAX(version) as v FROM _schema_version`);
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
      await this.db.query(`INSERT INTO _schema_version (version, name) VALUES ($1, $2)`, [migration.version, migration.name]);
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
      await this.db.query(`DELETE FROM _schema_version WHERE version = $1`, [migration.version]);
    }

    return applied.length;
  }
}