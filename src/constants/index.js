export const APP_NAME = 'CoreX';
export const APP_VERSION = '1.0.0';
export const DEFAULT_PER_PAGE = 20;
export const PER_PAGE_OPTIONS = [10, 20, 50, 100];
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
export const DEBOUNCE_DELAY = 300;
export const RETRY_MAX_ATTEMPTS = 3;
export const RETRY_BASE_DELAY = 500;
export const SESSION_TIMEOUT = 30 * 60 * 1000;
export const TOKEN_REFRESH_MARGIN = 5 * 60 * 1000;
export const STORAGE_KEYS = {
  THEME: 'corex_theme',
  TOKEN: 'corex_token',
  REFRESH_TOKEN: 'corex_refresh_token',
  LOCALE: 'corex_locale',
  SETTINGS: 'corex_settings',
};

// ---------------------------------------------------------------------------
// Invoice domain configuration — single source of truth.
// UI components and the service layer import from here; no value is ever
// hard-coded inside a component. These are defaults; the centralized Invoice
// Settings page (later) will persist overrides into the settings table.
// ---------------------------------------------------------------------------

// Invoice number prefixes — `value` is persisted, `label` is shown.
export const INVOICE_PREFIXES = Object.freeze([
  { value: 'INV', label: 'INV' },
  { value: 'INV-', label: 'INV-' },
  { value: 'BILL', label: 'BILL' },
  { value: 'TAX', label: 'TAX' },
]);

// How many digits pad the sequence after the prefix (INV-0001).
export const INVOICE_NUMBER_PAD = 4;
export const INVOICE_NUMBER_DEFAULT_START = 1;

// Status lifecycle. DRAFT is non-fiscal and excluded from sequence uniqueness
// until promoted; the rest are finalised fiscal states.
export const INVOICE_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
});

// Tax model. GST is intra-state (CGST+SGST) when supplier and customer are in
// the same state; otherwise IGST (inter-state). The page reads the supplier
// state from company settings and the customer state from the customer record.
export const TAX_TYPE = Object.freeze({
  CGST: 'cgst',
  SGST: 'sgst',
  IGST: 'igst',
  NONE: 'none',
});

// Default GST rate options exposed on the per-line tax selector (percent).
export const TAX_RATE_OPTIONS = Object.freeze([0, 5, 12, 18, 28]);

export const DISCOUNT_TYPE = Object.freeze({
  PERCENT: 'percent',
  FIXED: 'fixed',
});

export const PAYMENT_MODE = Object.freeze({
  CASH: 'cash',
  UPI: 'upi',
  BANK_TRANSFER: 'bank_transfer',
  CHEQUE: 'cheque',
  CARD: 'card',
  NEFT: 'neft',
  RTGS: 'rtgs',
  OTHER: 'other',
});

export const PAYMENT_MODE_OPTIONS = Object.freeze([
  { value: PAYMENT_MODE.CASH, label: 'Cash' },
  { value: PAYMENT_MODE.UPI, label: 'UPI' },
  { value: PAYMENT_MODE.BANK_TRANSFER, label: 'Bank Transfer' },
  { value: PAYMENT_MODE.CHEQUE, label: 'Cheque' },
  { value: PAYMENT_MODE.CARD, label: 'Card' },
  { value: PAYMENT_MODE.NEFT, label: 'NEFT' },
  { value: PAYMENT_MODE.RTGS, label: 'RTGS' },
  { value: PAYMENT_MODE.OTHER, label: 'Other' },
]);

export const DOC_TYPES = Object.freeze([
  'Regular', 'Estimate', 'Quotation', 'Proforma',
  'Tax Invoice', 'Debit Note', 'Credit Note', 'Delivery Challan',
]);

// Admin-defined custom header keys shipped by default. The Invoice Settings
// page will later allow editing this list; for now it lives centrally here.
export const DEFAULT_CUSTOM_HEADERS = Object.freeze([
  { key: 'vehicle_no', label: 'Vehicle No' },
  { key: 'po_number', label: 'PO Number' },
  { key: 'challan_no', label: 'Challan No.' },
  { key: 'delivery_date', label: 'Delivery Date' },
  { key: 'sales_person', label: 'Sales Person' },
  { key: 'dispatch_no', label: 'Dispatch Number' },
]);

// Days added to the invoice date to auto-compute the due date. Configurable.
export const DEFAULT_DUE_DATE_OFFSET_DAYS = 15;

// Attachments: supported types, count and per-file size cap. Mirrors the
// existing MAX_UPLOAD_SIZE convention but scoped to invoice attachments.
export const INVOICE_ATTACHMENT_MAX_FILES = 5;
export const INVOICE_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
export const INVOICE_ATTACHMENT_MIME_TYPES = Object.freeze([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

// Settings keys the invoice page reads (company state, name, GST, etc.).
// The Invoice Settings page writes to these keys later.
export const INVOICE_SETTING_KEYS = Object.freeze({
  COMPANY_NAME: 'invoice.company_name',
  COMPANY_STATE: 'invoice.company_state',
  COMPANY_GSTIN: 'invoice.company_gstin',
  DEFAULT_PREFIX: 'invoice.default_prefix',
  DEFAULT_DUE_DAYS: 'invoice.default_due_days',
  ENABLE_ROUND_OFF: 'invoice.enable_round_off',
  DEFAULT_SIGNATURE: 'invoice.default_signature',
  DEFAULT_BANK: 'invoice.default_bank',
});

// Input types supported by custom headers. Extensible by adding entries here
// and handling the new type in DynamicCustomHeaders render logic.
export const CUSTOM_HEADER_INPUT_TYPES = Object.freeze({
  TEXT: 'text',
  NUMBER: 'number',
  CURRENCY: 'currency',
  DATE: 'date',
  TIME: 'time',
  DATETIME: 'datetime',
  EMAIL: 'email',
  PHONE: 'phone',
  URL: 'url',
  DROPDOWN: 'dropdown',
  MULTI_SELECT: 'multi_select',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  TOGGLE: 'toggle',
  TEXTAREA: 'textarea',
});

export const CUSTOM_HEADER_INPUT_TYPE_OPTIONS = Object.freeze([
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
  { value: 'toggle', label: 'Toggle' },
  { value: 'textarea', label: 'Text Area' },
]);

// LocalStorage key for persisting visible invoice table columns.
export const COLUMN_STORAGE_KEY = 'corex_invoice_table_columns';

// Column definitions for the invoice line-item table. The `key` must match a
// COLUMN_RENDERERS entry in InvoiceTable.jsx; `always` columns are always
// shown regardless of user preferences; `defaultVisible` columns are on by
// default but can be toggled via column visibility controls.
export const INVOICE_TABLE_COLUMNS = Object.freeze([
  { key: 'lineNo', label: '#', always: true, width: 32 },
  { key: 'productName', label: 'Product Name', always: true },
  { key: 'description', label: 'Description', defaultVisible: false },
  { key: 'quantity', label: 'Qty', always: true },
  { key: 'freeQty', label: 'Free Qty', defaultVisible: false },
  { key: 'unit', label: 'Unit', defaultVisible: false },
  { key: 'unitPrice', label: 'Rate', always: true },
  { key: 'priceWithTax', label: 'Price with Tax', defaultVisible: false },
  { key: 'discount', label: 'Discount', always: true },
  { key: 'discountPct', label: 'Disc %', defaultVisible: false },
  { key: 'taxRate', label: 'Tax %', always: true },
  { key: 'taxAmount', label: 'Tax Amt', defaultVisible: false },
  { key: 'hsnSac', label: 'HSN/SAC', defaultVisible: false },
  { key: 'batch', label: 'Batch', defaultVisible: false },
  { key: 'warehouse', label: 'Warehouse', defaultVisible: false },
  { key: 'lineTotal', label: 'Total', always: true },
  { key: 'actions', label: '', always: true, width: 40 },
]);
