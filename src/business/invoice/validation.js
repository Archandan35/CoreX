// ---------------------------------------------------------------------------
// Invoice validation — returns a flat map of field -> message.
// Pure functions, reused by the UI for inline errors. Server-side
// authorization is enforced separately; this is domain/shape validation only.
// ---------------------------------------------------------------------------

import { INVOICE_ATTACHMENT_MAX_FILES, INVOICE_ATTACHMENT_MAX_SIZE, INVOICE_ATTACHMENT_MIME_TYPES } from '../../constants/index.js';

const isBlank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

export function validateCustomer(customer) {
  const e = {};
  if (!customer) return e;
  if (isBlank(customer.name)) e.name = 'Customer name is required.';
  if (!isBlank(customer.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) e.email = 'Enter a valid email address.';
  if (!isBlank(customer.phone) && !/^[\d\s+()-]{6,}$/.test(customer.phone)) e.phone = 'Enter a valid phone number.';
  if (!isBlank(customer.gstin) && customer.gstin.replace(/\s/g, '').length !== 15) e.gstin = 'GSTIN must be 15 characters.';
  return e;
}

export function validateProduct(product) {
  const e = {};
  if (!product) return e;
  if (isBlank(product.name)) e.name = 'Product name is required.';
  if (Number(product.unitPrice) < 0) e.unitPrice = 'Unit price cannot be negative.';
  if (Number(product.taxRate) < 0 || Number(product.taxRate) > 100) e.taxRate = 'Tax rate must be between 0 and 100.';
  return e;
}

export function validateBank(bank) {
  const e = {};
  if (!bank) return e;
  if (isBlank(bank.bank_name)) e.bank_name = 'Bank name is required.';
  if (isBlank(bank.account_number) && isBlank(bank.upi_id)) e.account_number = 'Provide an account number or UPI ID.';
  if (!isBlank(bank.ifsc) && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifsc)) e.ifsc = 'Enter a valid IFSC code.';
  return e;
}

// Validate a single invoice line item (inline row errors).
export function validateLine(line) {
  const e = {};
  if (isBlank(line?.name)) e.name = 'Required';
  if (Number(line?.quantity) <= 0) e.quantity = 'Qty must be > 0';
  if (Number(line?.unitPrice) < 0) e.unitPrice = 'Invalid';
  if (Number(line?.taxRate) < 0 || Number(line?.taxRate) > 100) e.taxRate = 'Invalid';
  if (Number(line?.discountValue) < 0) e.discountValue = 'Invalid';
  return e;
}

// Validate attachments against the centralized limits/types.
export function validateAttachment(file) {
  if (file.size > INVOICE_ATTACHMENT_MAX_SIZE) return 'File exceeds the maximum size.';
  if (!INVOICE_ATTACHMENT_MIME_TYPES.includes(file.type)) return 'File type is not supported.';
  return null;
}

export function withinAttachmentLimit(count) {
  return count < INVOICE_ATTACHMENT_MAX_FILES;
}

// Validate the whole invoice before save/finalise. `strict` requires a
// customer and at least one line (finalise); non-strict (draft) is lenient.
export function validateInvoice(invoice, { strict = true } = {}) {
  const e = {};
  const items = invoice?.items || [];

  if (isBlank(invoice?.invoiceNumber)) e.invoiceNumber = 'Invoice number is required.';

  if (strict) {
    if (!invoice?.customer?.id && isBlank(invoice?.customerId)) e.customer = 'Select a customer.';
    if (items.length === 0) e.items = 'Add at least one product or service.';
  }

  if (invoice?.invoiceDate && invoice?.dueDate) {
    if (new Date(invoice.dueDate) < new Date(invoice.invoiceDate)) {
      e.dueDate = 'Due date cannot be before invoice date.';
    }
  }

  // Per-line errors keyed by index for inline display.
  const lineErrors = items.map(validateLine);
  if (lineErrors.some((le) => Object.keys(le).length > 0)) e.lines = lineErrors;

  // Payments: amount and date required; cannot exceed grand total.
  const payments = invoice?.payments || [];
  if (payments.length) {
    const paid = payments.reduce((s, p) => s + (Number(p?.amount) || 0), 0);
    if (paid > Number(invoice?.grandTotal || 0)) e.payments = 'Total payments exceed the invoice amount.';
    payments.forEach((p, i) => {
      if (!p.amount || Number(p.amount) <= 0) e[`payment_${i}`] = 'Enter a valid amount.';
      if (!p.paymentDate) e[`payment_${i}`] = 'Payment date is required.';
    });
  }

  return e;
}

export function validateCustomHeaders(headers, values) {
  const e = {};
  if (!headers || !Array.isArray(headers)) return e;
  headers.forEach((h) => {
    const key = h.internalKey;
    const val = values?.[key];
    if (h.required && isBlank(val)) {
      e[key] = `${h.displayName || key} is required.`;
      return;
    }
    if (!isBlank(val)) {
      if (h.maxLength && typeof val === 'string' && val.length > Number(h.maxLength)) {
        e[key] = `${h.displayName || key} must not exceed ${h.maxLength} characters.`;
        return;
      }
      if (h.minLength && typeof val === 'string' && val.length < Number(h.minLength)) {
        e[key] = `${h.displayName || key} must be at least ${h.minLength} characters.`;
        return;
      }
      if (h.inputType === 'number' || h.inputType === 'currency') {
        if (Number.isNaN(Number(val))) {
          e[key] = `${h.displayName || key} must be a valid number.`;
          return;
        }
      }
      if (h.inputType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        e[key] = `${h.displayName || key} must be a valid email address.`;
        return;
      }
      if (h.inputType === 'phone' && !/^[\d\s+()-]{6,}$/.test(val)) {
        e[key] = `${h.displayName || key} must be a valid phone number.`;
        return;
      }
      if (h.inputType === 'url' && !/^https?:\/\/.+/.test(val)) {
        e[key] = `${h.displayName || key} must be a valid URL.`;
        return;
      }
    }
  });
  return e;
}

export function isValid(errors) {
  if (!errors) return true;
  return Object.keys(errors).length === 0;
}
