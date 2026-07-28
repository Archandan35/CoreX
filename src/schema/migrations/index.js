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