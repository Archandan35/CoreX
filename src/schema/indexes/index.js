export const INDEXES = Object.freeze({
  users: [
    { name: 'idx_users_name', columns: ['name'] },
    { name: 'idx_users_username', columns: ['username'] },
    { name: 'idx_users_email', columns: ['email'], unique: true },
    { name: 'idx_users_phone', columns: ['phone'] },
  ],
  customers: [
    { name: 'idx_customers_name', columns: ['name'] },
    { name: 'idx_customers_company', columns: ['company'] },
    { name: 'idx_customers_email', columns: ['email'] },
    { name: 'idx_customers_phone', columns: ['phone'] },
    { name: 'idx_customers_gstin', columns: ['gstin'] },
    { name: 'idx_customers_created_by', columns: ['created_by'] },
  ],
  product_categories: [
    { name: 'idx_product_categories_name', columns: ['name'] },
  ],
  products: [
    { name: 'idx_products_name', columns: ['name'] },
    { name: 'idx_products_sku', columns: ['sku'] },
    { name: 'idx_products_barcode', columns: ['barcode'] },
    { name: 'idx_products_hsn_code', columns: ['hsn_code'] },
    { name: 'idx_products_created_by', columns: ['created_by'] },
  ],
  banks: [
    { name: 'idx_banks_bank_name', columns: ['bank_name'] },
    { name: 'idx_banks_account_name', columns: ['account_name'] },
    { name: 'idx_banks_account_number', columns: ['account_number'] },
    { name: 'idx_banks_ifsc', columns: ['ifsc'] },
    { name: 'idx_banks_upi_id', columns: ['upi_id'] },
  ],
  signatures: [
    { name: 'idx_signatures_label', columns: ['label'] },
    { name: 'idx_signatures_signer_name', columns: ['signer_name'] },
  ],
  invoices: [
    { name: 'idx_invoices_invoice_number', columns: ['invoice_number'] },
    { name: 'idx_invoices_reference', columns: ['reference'] },
    { name: 'idx_invoices_customer_id', columns: ['customer_id'] },
    { name: 'idx_invoices_created_by', columns: ['created_by'] },
    { name: 'idx_invoices_status', columns: ['status'] },
  ],
  invoice_items: [
    { name: 'idx_invoice_items_name', columns: ['name'] },
    { name: 'idx_invoice_items_invoice_id', columns: ['invoice_id'] },
  ],
  invoice_payments: [
    { name: 'idx_invoice_payments_note', columns: ['note'] },
    { name: 'idx_invoice_payments_invoice_id', columns: ['invoice_id'] },
  ],
  audit_logs: [
    { name: 'idx_audit_logs_table_record', columns: ['table_name', 'record_id'] },
    { name: 'idx_audit_logs_created_at', columns: ['created_at'] },
  ],
  accounting_entries: [
    { name: 'idx_accounting_entries_invoice', columns: ['invoice_id'] },
  ],
});

export function generateCreateIndexSQL(table) {
  const indexes = INDEXES[table];
  if (!indexes) return [];

  return indexes.map((idx) => {
    const cols = idx.columns.join(', ');
    const unique = idx.unique ? 'UNIQUE ' : '';
    return `CREATE ${unique}INDEX IF NOT EXISTS ${idx.name} ON ${table} (${cols});`;
  });
}