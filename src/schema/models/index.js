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
    rls: false,
  },
  settings: {
    table: 'settings',
    columns: ['key', 'value', 'updated_at'],
    columnTypes: { key: 'TEXT', value: 'TEXT', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'key',
    nullable: ['value'],
    defaults: { updated_at: 'NOW()' },
    rls: false,
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
    columns: ['id', 'name', 'company', 'email', 'phone', 'gstin', 'billing_address', 'shipping_address', 'state', 'city', 'postal_code', 'outstanding_balance', 'total_purchases', 'credit_limit', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', company: 'TEXT', email: 'TEXT', phone: 'TEXT', gstin: 'TEXT', billing_address: 'TEXT', shipping_address: 'TEXT', state: 'TEXT', city: 'TEXT', postal_code: 'TEXT', outstanding_balance: 'NUMERIC', total_purchases: 'NUMERIC', credit_limit: 'NUMERIC', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['company', 'email', 'phone', 'gstin', 'billing_address', 'shipping_address', 'state', 'city', 'postal_code', 'created_by'],
    defaults: { outstanding_balance: '0', total_purchases: '0', credit_limit: '0', created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['name', 'company', 'email', 'phone', 'gstin'],
    indexes: ['created_by'],
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

  product_brands: {
    table: 'product_brands',
    columns: ['id', 'name', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['created_by'],
    defaults: { created_at: 'NOW()', updated_at: 'NOW()' },
    unique: { name: 'name' },
    rls: true,
    searchableFields: ['name'],
  },

  product_units: {
    table: 'product_units',
    columns: ['id', 'name', 'is_primary', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', is_primary: 'BOOLEAN', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['created_by'],
    defaults: { is_primary: 'false', created_at: 'NOW()', updated_at: 'NOW()' },
    unique: { name: 'name' },
    rls: true,
    searchableFields: ['name'],
  },

  product_warehouses: {
    table: 'product_warehouses',
    columns: ['id', 'name', 'location', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', location: 'TEXT', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['location', 'created_by'],
    defaults: { created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['name'],
  },

  product_tax_rates: {
    table: 'product_tax_rates',
    columns: ['id', 'name', 'rate', 'is_default', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', rate: 'NUMERIC', is_default: 'BOOLEAN', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['created_by'],
    defaults: { rate: '0', is_default: 'false', created_at: 'NOW()', updated_at: 'NOW()' },
    unique: { name: 'name' },
    rls: true,
    searchableFields: ['name'],
  },

  product_item_groups: {
    table: 'product_item_groups',
    columns: ['id', 'name', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['created_by'],
    defaults: { created_at: 'NOW()', updated_at: 'NOW()' },
    unique: { name: 'name' },
    rls: true,
    searchableFields: ['name'],
  },

  product_manufacturers: {
    table: 'product_manufacturers',
    columns: ['id', 'name', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['created_by'],
    defaults: { created_at: 'NOW()', updated_at: 'NOW()' },
    unique: { name: 'name' },
    rls: true,
    searchableFields: ['name'],
  },

  supplier_categories: {
    table: 'supplier_categories',
    columns: ['id', 'name', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['created_by'],
    defaults: { created_at: 'NOW()', updated_at: 'NOW()' },
    unique: { name: 'name' },
    rls: true,
    searchableFields: ['name'],
  },

  product_suppliers: {
    table: 'product_suppliers',
    columns: ['id', 'name', 'company', 'contact_person', 'email', 'phone', 'address', 'gstin', 'category_id', 'city', 'payment_terms', 'outstanding_amount', 'status', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', company: 'TEXT', contact_person: 'TEXT', email: 'TEXT', phone: 'TEXT', address: 'TEXT', gstin: 'TEXT', category_id: 'UUID', city: 'TEXT', payment_terms: 'TEXT', outstanding_amount: 'NUMERIC', status: 'TEXT', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['company', 'contact_person', 'email', 'phone', 'address', 'gstin', 'category_id', 'city', 'payment_terms', 'created_by'],
    defaults: { outstanding_amount: '0', status: "'active'", created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['name', 'company', 'email', 'phone', 'gstin', 'city'],
    indexes: ['created_by', 'status', 'category_id'],
  },

  products: {
    table: 'products',
    columns: ['id', 'name', 'sku', 'barcode', 'category_id', 'supplier_id', 'description', 'unit_price', 'mrp', 'purchase_price', 'tax_rate', 'unit', 'hsn_code', 'item_code', 'item_group', 'brand', 'manufacturer', 'tax_type', 'is_service', 'is_featured', 'show_online', 'not_for_sale', 'allow_negative', 'track_serial', 'track_batch', 'track_expiry', 'max_discount', 'cess', 'reorder_qty', 'stock_quantity', 'stock_alert', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', sku: 'TEXT', barcode: 'TEXT', category_id: 'UUID', supplier_id: 'UUID', description: 'TEXT', unit_price: 'NUMERIC', mrp: 'NUMERIC', purchase_price: 'NUMERIC', tax_rate: 'NUMERIC', unit: 'TEXT', hsn_code: 'TEXT', item_code: 'TEXT', item_group: 'TEXT', brand: 'TEXT', manufacturer: 'TEXT', tax_type: 'TEXT', is_service: 'BOOLEAN', is_featured: 'BOOLEAN', show_online: 'BOOLEAN', not_for_sale: 'BOOLEAN', allow_negative: 'BOOLEAN', track_serial: 'BOOLEAN', track_batch: 'BOOLEAN', track_expiry: 'BOOLEAN', max_discount: 'NUMERIC', cess: 'NUMERIC', reorder_qty: 'NUMERIC', stock_quantity: 'NUMERIC', stock_alert: 'NUMERIC', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['sku', 'barcode', 'category_id', 'supplier_id', 'description', 'unit', 'hsn_code', 'item_code', 'item_group', 'brand', 'manufacturer', 'created_by'],
    defaults: { unit_price: '0', mrp: '0', purchase_price: '0', tax_rate: '0', tax_type: "'exclusive'", is_service: 'false', is_featured: 'false', show_online: 'false', not_for_sale: 'false', allow_negative: 'false', track_serial: 'false', track_batch: 'false', track_expiry: 'false', max_discount: '0', cess: '0', reorder_qty: '0', stock_quantity: '0', stock_alert: '0', created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['name', 'sku', 'barcode', 'hsn_code', 'item_code'],
    indexes: ['created_by', 'supplier_id'],
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
    indexes: ['customer_id', 'created_by', 'status'],
  },

  invoice_items: {
    table: 'invoice_items',
    columns: ['id', 'invoice_id', 'product_id', 'name', 'description', 'show_description', 'quantity', 'unit_price', 'tax_rate', 'discount_type', 'discount_value', 'discount_amount', 'tax_amount', 'line_total', 'sort_order', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', invoice_id: 'UUID', product_id: 'UUID', name: 'TEXT', description: 'TEXT', show_description: 'BOOLEAN', quantity: 'NUMERIC', unit_price: 'NUMERIC', tax_rate: 'NUMERIC', discount_type: 'TEXT', discount_value: 'NUMERIC', discount_amount: 'NUMERIC', tax_amount: 'NUMERIC', line_total: 'NUMERIC', sort_order: 'INTEGER', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['product_id', 'description', 'discount_type'],
    defaults: { show_description: 'false', quantity: '1', unit_price: '0', tax_rate: '0', discount_type: "'percent'", discount_value: '0', discount_amount: '0', tax_amount: '0', line_total: '0', sort_order: '0', created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['name'],
    indexes: ['invoice_id'],
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
    indexes: ['invoice_id'],
  },

  audit_logs: {
    table: 'audit_logs',
    columns: ['id', 'table_name', 'record_id', 'action', 'old_values', 'new_values', 'changed_by', 'ip_address', 'created_at'],
    columnTypes: { id: 'UUID', table_name: 'TEXT', record_id: 'TEXT', action: 'TEXT', old_values: 'JSONB', new_values: 'JSONB', changed_by: 'UUID', ip_address: 'TEXT', created_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['old_values', 'new_values', 'changed_by', 'ip_address'],
    defaults: { created_at: 'NOW()' },
    rls: false,
    indexes: ['table_name', 'record_id', 'created_at'],
  },

  accounting_entries: {
    table: 'accounting_entries',
    columns: ['id', 'invoice_id', 'entry_type', 'account_name', 'amount', 'description', 'created_at'],
    columnTypes: { id: 'UUID', invoice_id: 'UUID', entry_type: 'TEXT', account_name: 'TEXT', amount: 'NUMERIC', description: 'TEXT', created_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['description'],
    defaults: { amount: '0', created_at: 'NOW()' },
    rls: false,
    indexes: ['invoice_id'],
  },

  // -------------------------------------------------------------------------
  // Invoice settings domain. These tables replace the JSON blobs that were
  // previously stored in the `settings` table under keys like
  // `_prefix_settings`, `_custom_headers`, `_document_notes` and
  // `documentSettings`. Each carries `created_by` and is RLS protected with
  // owner policies (matching the invoice domain tables above).
  // -------------------------------------------------------------------------

  document_prefixes: {
    table: 'document_prefixes',
    columns: ['id', 'value', 'description', 'doc_type', 'is_active', 'is_default', 'sequence_order', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', value: 'TEXT', description: 'TEXT', doc_type: 'TEXT', is_active: 'BOOLEAN', is_default: 'BOOLEAN', sequence_order: 'INTEGER', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['description', 'created_by'],
    defaults: { is_active: 'true', is_default: 'false', sequence_order: '1', created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['value', 'description'],
    indexes: ['doc_type'],
  },

  document_suffixes: {
    table: 'document_suffixes',
    columns: ['id', 'value', 'description', 'doc_type', 'is_active', 'is_default', 'sequence_order', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', value: 'TEXT', description: 'TEXT', doc_type: 'TEXT', is_active: 'BOOLEAN', is_default: 'BOOLEAN', sequence_order: 'INTEGER', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['description', 'created_by'],
    defaults: { is_active: 'true', is_default: 'false', sequence_order: '1', created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['value', 'description'],
    indexes: ['doc_type'],
  },

  custom_headers: {
    table: 'custom_headers',
    columns: ['id', 'display_name', 'internal_key', 'input_type', 'options', 'active', 'visible', 'is_default', 'display_order', 'column_position', 'doc_types', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', display_name: 'TEXT', internal_key: 'TEXT', input_type: 'TEXT', options: 'TEXT', active: 'BOOLEAN', visible: 'BOOLEAN', is_default: 'BOOLEAN', display_order: 'INTEGER', column_position: 'INTEGER', doc_types: 'TEXT[]', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['options', 'doc_types', 'created_by'],
    defaults: { input_type: "'text'", active: 'true', visible: 'true', is_default: 'false', display_order: '1', column_position: '1', created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['display_name', 'internal_key'],
    indexes: ['active', 'display_order'],
  },

  document_notes: {
    table: 'document_notes',
    columns: ['id', 'doc_type', 'title', 'content', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', doc_type: 'TEXT', title: 'TEXT', content: 'TEXT', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['doc_type', 'title', 'content', 'created_by'],
    defaults: { created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['content'],
    indexes: ['doc_type'],
  },

  document_terms: {
    table: 'document_terms',
    columns: ['id', 'doc_type', 'title', 'content', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', doc_type: 'TEXT', title: 'TEXT', content: 'TEXT', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['doc_type', 'title', 'content', 'created_by'],
    defaults: { created_at: 'NOW()', updated_at: 'NOW()' },
    rls: true,
    searchableFields: ['content'],
    indexes: ['doc_type'],
  },

  invoice_table_columns: {
    table: 'invoice_table_columns',
    columns: ['id', 'key', 'label', 'always', 'default_visible', 'width', 'permission', 'display_order', 'created_by', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', key: 'TEXT', label: 'TEXT', always: 'BOOLEAN', default_visible: 'BOOLEAN', width: 'INTEGER', permission: 'TEXT', display_order: 'INTEGER', created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['width', 'permission', 'created_by'],
    defaults: { always: 'false', default_visible: 'false', display_order: '1', created_at: 'NOW()', updated_at: 'NOW()' },
    unique: { key: 'key' },
    rls: true,
    searchableFields: ['key', 'label'],
    indexes: ['display_order'],
  },

  document_settings: {
    table: 'document_settings',
    columns: [
      'id', 'invoice_template', 'custom_fields_enabled', 'prefix_suffix', 'default_notes_and_terms',
      'show_images', 'show_net_balance', 'show_previous_dues', 'show_due_date', 'show_dispatch_address',
      'show_payments', 'show_round_off', 'show_receiver_signature', 'hide_quantity',
      'show_quantity_3_decimals', 'show_quantity_conversion', 'hide_discount', 'show_discount_column',
      'price_decimals', 'hide_hsn_sac', 'show_company_details', 'show_brand_name', 'show_hsn_sac_summary',
      'hsn_sac_summary_on', 'pdf_footer', 'thermal_footer', 'header_image', 'footer_image',
      'banner_image_top', 'banner_image_bottom', 'pdf_language', 'pdf_font_style', 'pdf_font_size',
      'pdf_orientation', 'repeat_header', 'enable_item_headers', 'show_full_page', 'show_striped_rows',
      'pdf_margin_top', 'pdf_margin_bottom', 'pdf_margin_left', 'pdf_margin_right',
      'show_conversion_factor', 'show_inr', 'pdf_accent_color', 'watermark', 'social_links',
      'labels', 'email_template', 'whatsapp_template', 'default_due_days',
      'created_by', 'created_at', 'updated_at',
    ],
    columnTypes: {
      id: 'UUID', invoice_template: 'TEXT', custom_fields_enabled: 'BOOLEAN', prefix_suffix: 'JSONB',
      default_notes_and_terms: 'JSONB', show_images: 'BOOLEAN', show_net_balance: 'BOOLEAN',
      show_previous_dues: 'BOOLEAN', show_due_date: 'BOOLEAN', show_dispatch_address: 'BOOLEAN',
      show_payments: 'BOOLEAN', show_round_off: 'BOOLEAN', show_receiver_signature: 'BOOLEAN',
      hide_quantity: 'BOOLEAN', show_quantity_3_decimals: 'BOOLEAN', show_quantity_conversion: 'BOOLEAN',
      hide_discount: 'BOOLEAN', show_discount_column: 'BOOLEAN', price_decimals: 'TEXT',
      hide_hsn_sac: 'BOOLEAN', show_company_details: 'BOOLEAN', show_brand_name: 'BOOLEAN',
      show_hsn_sac_summary: 'BOOLEAN', hsn_sac_summary_on: 'TEXT', pdf_footer: 'TEXT',
      thermal_footer: 'TEXT', header_image: 'TEXT', footer_image: 'TEXT', banner_image_top: 'TEXT',
      banner_image_bottom: 'TEXT', pdf_language: 'TEXT', pdf_font_style: 'TEXT', pdf_font_size: 'TEXT',
      pdf_orientation: 'TEXT', repeat_header: 'BOOLEAN', enable_item_headers: 'BOOLEAN',
      show_full_page: 'BOOLEAN', show_striped_rows: 'BOOLEAN', pdf_margin_top: 'TEXT',
      pdf_margin_bottom: 'TEXT', pdf_margin_left: 'TEXT', pdf_margin_right: 'TEXT',
      show_conversion_factor: 'BOOLEAN', show_inr: 'BOOLEAN', pdf_accent_color: 'TEXT',
      watermark: 'TEXT', social_links: 'TEXT', labels: 'JSONB', email_template: 'JSONB',
      whatsapp_template: 'JSONB', default_due_days: 'INTEGER',
      created_by: 'UUID', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ',
    },
    primaryKey: 'id',
    nullable: [
      'prefix_suffix', 'default_notes_and_terms', 'pdf_footer', 'thermal_footer', 'header_image',
      'footer_image', 'banner_image_top', 'banner_image_bottom', 'watermark', 'social_links',
      'labels', 'email_template', 'whatsapp_template', 'default_due_days', 'created_by',
    ],
    defaults: {
      invoice_template: "'classic'", custom_fields_enabled: 'false', show_images: 'true',
      show_net_balance: 'true', show_previous_dues: 'false', show_due_date: 'true',
      show_dispatch_address: 'true', show_payments: 'true', show_round_off: 'true',
      show_receiver_signature: 'false', hide_quantity: 'false', show_quantity_3_decimals: 'false',
      show_quantity_conversion: 'false', hide_discount: 'false', show_discount_column: 'false',
      price_decimals: "'2'", hide_hsn_sac: 'false', show_company_details: 'true',
      show_brand_name: 'false', show_hsn_sac_summary: 'false', hsn_sac_summary_on: "'+10...'",
      pdf_language: "'English (Default)'", pdf_font_style: "'Stylish'", pdf_font_size: "'normal'",
      pdf_orientation: "'Portrait'", repeat_header: 'false', enable_item_headers: 'false',
      show_full_page: 'false', show_striped_rows: 'false', pdf_margin_top: "'0'",
      pdf_margin_bottom: "'0'", pdf_margin_left: "'24'", pdf_margin_right: "'24'",
      show_conversion_factor: 'false', show_inr: 'false', pdf_accent_color: "'#3815f7e6'",
      created_at: 'NOW()', updated_at: 'NOW()',
    },
    rls: true,
  },

  document_type_master: {
    table: 'document_type_master',
    columns: ['id', 'name', 'label', 'description', 'created_at', 'updated_at'],
    columnTypes: { id: 'UUID', name: 'TEXT', label: 'TEXT', description: 'TEXT', created_at: 'TIMESTAMPTZ', updated_at: 'TIMESTAMPTZ' },
    primaryKey: 'id',
    nullable: ['label', 'description'],
    defaults: { created_at: 'NOW()', updated_at: 'NOW()' },
    unique: { name: 'name' },
    rls: false,
    searchableFields: ['name'],
  },

  _schema_version: {
    table: '_schema_version',
    columns: ['version', 'applied_at', 'description'],
    columnTypes: { version: 'INTEGER', applied_at: 'TIMESTAMPTZ', description: 'TEXT' },
    primaryKey: 'version',
    nullable: ['applied_at', 'description'],
    defaults: { applied_at: 'NOW()' },
    rls: false,
  },
};

SCHEMAS.version = 5;
SCHEMAS.extensions = [];
SCHEMAS.seedData = [
  {
    table: 'document_type_master',
    required: true,
    minCount: 1,
    data: [
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000001', name: 'Invoice' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000002', name: 'Purchase' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000003', name: 'Sales Return' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000004', name: 'Purchase Return' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000005', name: 'Purchase Order' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000006', name: 'Delivery Challan' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000007', name: 'Sales Order' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000008', name: 'Quotation' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000009', name: 'Pro Forma Invoice' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000010', name: 'Subscription' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000011', name: 'Sales Debit Note' },
    ],
  },
  {
    table: 'supplier_categories',
    required: true,
    minCount: 1,
    data: [
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000101', name: 'Groceries' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000102', name: 'Dairy Products' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000103', name: 'Beverages' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000104', name: 'General' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000105', name: 'Snacks' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000106', name: 'Home Care' },
      { id: 'e15c7e40-9b2a-4f6a-9d1e-000000000107', name: 'Personal Care' },
    ],
  },
];
SCHEMAS.requiredTriggers = [
  { name: 'on_auth_user_created', schema: 'auth', table: 'users', event: 'AFTER INSERT', function: 'handle_new_user' },
];
SCHEMAS.functionGrants = [
  { function: 'exec_sql', args: 'text', roles: ['anon', 'authenticated', 'service_role'] },
  { function: 'check_admin_exists', args: '', roles: ['anon', 'authenticated', 'service_role'] },
  { function: 'is_admin_user', args: '', roles: ['anon', 'authenticated', 'service_role'] },
];
