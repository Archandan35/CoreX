// Helper to generate the SECURITY DEFINER exec_sql function SQL.
// Used by SqlGenerator to include it in full-schema output.
// This is a separate utility so the SQL is defined in ONE place
// and shared between the generator and any other consumer.
export function buildExecSqlFunction() {
  return `CREATE OR REPLACE FUNCTION exec_sql(query_text text)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE query_text;
END;
$$;

-- Grant EXECUTE to anon, authenticated, and service_role so the function
-- is callable via Supabase REST API (without this, Supabase returns a
-- permissions error when the browser calls supabase.rpc('exec_sql', ...)).
GRANT EXECUTE ON FUNCTION exec_sql(text) TO anon, authenticated, service_role;`;
}

// Helper to generate the check_admin_exists function SQL.
// Referenced by App.jsx and SupabaseAuth.js at runtime.
export function buildCheckAdminExistsFunction() {
  return `CREATE OR REPLACE FUNCTION public.check_admin_exists()
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
GRANT EXECUTE ON FUNCTION public.check_admin_exists() TO anon, authenticated, service_role;`;
}

// Helper to generate the is_admin_user function SQL.
// This SECURITY DEFINER function bypasses RLS to prevent infinite recursion
// when called from within an RLS policy. Referenced by RLS policies on the
// users table and must be created before those policies.
export function buildIsAdminUserFunction() {
  return `CREATE OR REPLACE FUNCTION public.is_admin_user()
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
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon, authenticated, service_role;`;
}

export const SCHEMAS = {
  users: {
    table: 'users',
    columns: ['id', 'name', 'username', 'email', 'phone', 'password_hash', 'role_label', 'full_access', 'permissions', 'status', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', username: 'TEXT', email: 'TEXT', phone: 'TEXT', password_hash: 'TEXT', role_label: 'TEXT', full_access: 'BOOLEAN', permissions: 'TEXT[]', status: 'TEXT', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['phone', 'username', 'role_label', 'permissions', 'password_hash'],
    defaults: { full_access: 'false', status: "'active'", created_at: 'NOW()', updated_at: 'NOW()' },
    unique: { email: 'email', username: 'username' },
    rls: true,
    searchableFields: ['name', 'username', 'email', 'phone'],
  },
  roles: {
    table: 'roles',
    columns: ['id', 'name', 'label', 'description', 'permissions', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', label: 'TEXT', description: 'TEXT', permissions: 'TEXT[]', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['description'],
    defaults: { created_at: 'NOW()', updated_at: 'NOW()' },
    unique: { name: 'name' },
  },
  settings: {
    table: 'settings',
    columns: ['key', 'value', 'updated_at'],
    columnTypes: { key: 'TEXT', value: 'TEXT', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'key',
    nullable: ['value'],
    defaults: { updated_at: 'NOW()' },
  },
  // Built-in functions required by the application runtime.
  // These are modeled here so SqlGenerator can produce them as part
  // of the canonical schema output whenever full-schema mode is used.
  exec_sql: {
    type: 'function',
    build: buildExecSqlFunction,
    description: 'SECURITY DEFINER helper for arbitrary SQL execution via RPC',
  },
  check_admin_exists: {
    type: 'function',
    build: buildCheckAdminExistsFunction,
    description: 'Checks whether at least one full_access administrator exists',
  },
  is_admin_user: {
    type: 'function',
    build: buildIsAdminUserFunction,
    description: 'SECURITY DEFINER helper to check admin status (bypasses RLS to prevent infinite recursion)',
  },

  // -------------------------------------------------------------------------
  // Invoice domain. All tables carry `created_by` (auth.uid()) and are RLS
  // protected so a user only sees rows they own, while full_access admins see
  // everything (via is_admin_user()). Detailed policies live in
  // generate-sql.sql (the canonical source) — this model metadata drives the
  // SqlGenerator's enable-RLS statement and table DDL.
  // -------------------------------------------------------------------------

  customers: {
    table: 'customers',
    columns: ['id', 'name', 'company', 'email', 'phone', 'gstin', 'billing_address', 'shipping_address', 'state', 'city', 'postal_code', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', company: 'TEXT', email: 'TEXT', phone: 'TEXT', gstin: 'TEXT', billing_address: 'TEXT', shipping_address: 'TEXT', state: 'TEXT', city: 'TEXT', postal_code: 'TEXT', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['company', 'email', 'phone', 'gstin', 'billing_address', 'shipping_address', 'state', 'city', 'postal_code', 'created_by'],
    defaults: { created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['name', 'company', 'email', 'phone', 'gstin'],
  },

  product_categories: {
    table: 'product_categories',
    columns: ['id', 'name', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['created_by'],
    defaults: { created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['name'],
  },

  products: {
    table: 'products',
    columns: ['id', 'name', 'sku', 'barcode', 'category_id', 'description', 'unit_price', 'tax_rate', 'unit', 'hsn_code', 'is_service', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', sku: 'TEXT', barcode: 'TEXT', category_id: 'UUID', description: 'TEXT', unit_price: 'NUMERIC', tax_rate: 'NUMERIC', unit: 'TEXT', hsn_code: 'TEXT', is_service: 'BOOLEAN', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['sku', 'barcode', 'category_id', 'description', 'unit', 'hsn_code', 'created_by'],
    defaults: { unit_price: '0', tax_rate: '0', is_service: 'false', created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['name', 'sku', 'barcode', 'hsn_code'],
  },

  banks: {
    table: 'banks',
    columns: ['id', 'bank_name', 'account_name', 'account_number', 'ifsc', 'branch', 'upi_id', 'is_default', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', bank_name: 'TEXT', account_name: 'TEXT', account_number: 'TEXT', ifsc: 'TEXT', branch: 'TEXT', upi_id: 'TEXT', is_default: 'BOOLEAN', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['account_name', 'account_number', 'ifsc', 'branch', 'upi_id', 'created_by'],
    defaults: { is_default: 'false', created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['bank_name', 'account_name', 'account_number', 'ifsc', 'upi_id'],
  },

  signatures: {
    table: 'signatures',
    columns: ['id', 'label', 'image_url', 'signer_name', 'is_default', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', label: 'TEXT', image_url: 'TEXT', signer_name: 'TEXT', is_default: 'BOOLEAN', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['label', 'image_url', 'signer_name', 'created_by'],
    defaults: { is_default: 'false', created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['label', 'signer_name'],
  },

  invoices: {
    table: 'invoices',
    columns: ['id', 'invoice_number', 'prefix', 'customer_id', 'invoice_date', 'due_date', 'reference', 'custom_headers', 'notes', 'terms', 'attachments', 'reverse_charge', 'create_ewaybill', 'create_einvoice', 'tds_enabled', 'tcs_enabled', 'extra_discount_type', 'extra_discount_value', 'round_off', 'bank_id', 'signature_id', 'subtotal', 'discount_total', 'taxable_amount', 'cgst_total', 'sgst_total', 'igst_total', 'tax_total', 'additional_charges_total', 'grand_total', 'amount_paid', 'balance_due', 'status', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', invoice_number: 'TEXT', prefix: 'TEXT', customer_id: 'UUID', invoice_date: 'DATE', due_date: 'DATE', reference: 'TEXT', custom_headers: 'JSONB', notes: 'JSONB', terms: 'JSONB', attachments: 'JSONB', reverse_charge: 'BOOLEAN', create_ewaybill: 'BOOLEAN', create_einvoice: 'BOOLEAN', tds_enabled: 'BOOLEAN', tcs_enabled: 'BOOLEAN', extra_discount_type: 'TEXT', extra_discount_value: 'NUMERIC', round_off: 'BOOLEAN', bank_id: 'UUID', signature_id: 'UUID', subtotal: 'NUMERIC', discount_total: 'NUMERIC', taxable_amount: 'NUMERIC', cgst_total: 'NUMERIC', sgst_total: 'NUMERIC', igst_total: 'NUMERIC', tax_total: 'NUMERIC', additional_charges_total: 'NUMERIC', grand_total: 'NUMERIC', amount_paid: 'NUMERIC', balance_due: 'NUMERIC', status: 'TEXT', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['reference', 'custom_headers', 'notes', 'terms', 'attachments', 'extra_discount_type', 'bank_id', 'signature_id', 'customer_id', 'created_by'],
    defaults: { reverse_charge: 'false', create_ewaybill: 'false', create_einvoice: 'false', tds_enabled: 'false', tcs_enabled: 'false', extra_discount_value: '0', round_off: 'true', subtotal: '0', discount_total: '0', taxable_amount: '0', cgst_total: '0', sgst_total: '0', igst_total: '0', tax_total: '0', additional_charges_total: '0', grand_total: '0', amount_paid: '0', balance_due: '0', status: "'draft'", created_at: 'NOW()', updated_at: 'NOW()' },
    unique: { invoice_number: 'invoice_number' },
    rls: true,
    searchableFields: ['invoice_number', 'reference'],
  },

  invoice_items: {
    table: 'invoice_items',
    columns: ['id', 'invoice_id', 'product_id', 'name', 'description', 'show_description', 'quantity', 'unit_price', 'tax_rate', 'discount_type', 'discount_value', 'discount_amount', 'tax_amount', 'line_total', 'sort_order', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', invoice_id: 'UUID', product_id: 'UUID', name: 'TEXT', description: 'TEXT', show_description: 'BOOLEAN', quantity: 'NUMERIC', unit_price: 'NUMERIC', tax_rate: 'NUMERIC', discount_type: 'TEXT', discount_value: 'NUMERIC', discount_amount: 'NUMERIC', tax_amount: 'NUMERIC', line_total: 'NUMERIC', sort_order: 'INTEGER', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['product_id', 'description', 'discount_type', 'created_by'],
    defaults: { show_description: 'false', quantity: '1', unit_price: '0', tax_rate: '0', discount_type: "'percent'", discount_value: '0', discount_amount: '0', tax_amount: '0', line_total: '0', sort_order: '0', created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['name'],
  },

  invoice_payments: {
    table: 'invoice_payments',
    columns: ['id', 'invoice_id', 'amount', 'payment_date', 'mode', 'note', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', invoice_id: 'UUID', amount: 'NUMERIC', payment_date: 'DATE', mode: 'TEXT', note: 'TEXT', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['note', 'mode', 'created_by'],
    defaults: { amount: '0', payment_date: 'NOW()', created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['note'],
  },
};

SCHEMAS.version = 4;
SCHEMAS.extensions = [];
SCHEMAS.seedData = [];
