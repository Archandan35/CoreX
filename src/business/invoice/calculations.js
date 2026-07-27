// ---------------------------------------------------------------------------
// Invoice calculations — pure, deterministic functions.
// No provider access, no React, no side effects. Consumed by the Create
// Invoice page (memoized) and mirrored conceptually by the server. All
// rounding uses 2-decimal currency rounding; no value is hard-coded — tax
// rate is per line, discount type/value per line & at invoice level.
// ---------------------------------------------------------------------------

import { DISCOUNT_TYPE } from '../../constants/index.js';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Compute a single line item's derived amounts.
//   quantity      — numeric (may be fractional, e.g. 1.5 kg)
//   unitPrice     — numeric
//   taxRate       — percent (0 = exempt)
//   discountType  — 'percent' | 'fixed'
//   discountValue — percent or absolute amount
export function computeLine(line) {
  const qty = Math.max(0, Number(line?.quantity) || 0);
  const price = Math.max(0, Number(line?.unitPrice) || 0);
  const gross = round2(qty * price);

  let discount = 0;
  const dv = Number(line?.discountValue) || 0;
  if (line?.discountType === DISCOUNT_TYPE.FIXED) {
    discount = round2(Math.min(dv, gross));
  } else {
    discount = round2((gross * Math.min(Math.max(dv, 0), 100)) / 100);
  }

  const taxable = round2(Math.max(0, gross - discount));
  const rate = Math.max(0, Number(line?.taxRate) || 0);
  const taxAmount = round2((taxable * rate) / 100);
  const lineTotal = round2(taxable + taxAmount);

  const priceWithTax = qty > 0 ? round2(lineTotal / qty) : round2(price * (1 + rate / 100));

  return { gross, discount, taxable, taxAmount, lineTotal, priceWithTax };
}

// Aggregate every line into per-line computed rows plus invoice subtotals.
export function computeLines(items) {
  const rows = (items || []).map((it) => ({ ...it, ...computeLine(it) }));
  const subtotal = round2(rows.reduce((s, r) => s + r.gross, 0));
  const lineDiscountTotal = round2(rows.reduce((s, r) => s + r.discount, 0));
  const taxableAmount = round2(rows.reduce((s, r) => s + r.taxable, 0));
  return { rows, subtotal, lineDiscountTotal, taxableAmount };
}

// Invoice-level discount (extra discount applied after line discounts).
function computeInvoiceDiscount(taxableAmount, type, value) {
  const v = Number(value) || 0;
  if (type === DISCOUNT_TYPE.FIXED) return round2(Math.min(v, taxableAmount));
  return round2((taxableAmount * Math.min(Math.max(v, 0), 100)) / 100);
}

// Split tax into CGST+SGST (intra-state) or IGST (inter-state) based on
// whether the supplier's state matches the customer's state.
export function splitTax(taxableAmount, taxRate, sameState) {
  const base = round2((taxableAmount * Math.max(0, Number(taxRate) || 0)) / 100);
  if (sameState) {
    const half = round2(base / 2);
    return { cgst: half, sgst: half, igst: 0, total: base };
  }
  return { cgst: 0, sgst: 0, igst: base, total: base };
}

// Full invoice totals. `additionalCharges` is an array of
// { amount, taxable } objects; taxable charges contribute to the tax base.
export function computeInvoice(invoice) {
  const { rows, subtotal, lineDiscountTotal, taxableAmount: lineTaxable } = computeLines(invoice?.items);

  // Additional charges.
  const charges = (invoice?.additionalCharges || []).map((c) => ({
    ...c,
    amount: round2(Math.max(0, Number(c?.amount) || 0)),
    taxable: !!c?.taxable,
  }));
  const taxableCharges = round2(charges.filter((c) => c.taxable).reduce((s, c) => s + c.amount, 0));
  const nonTaxableCharges = round2(charges.filter((c) => !c.taxable).reduce((s, c) => s + c.amount, 0));
  const additionalChargesTotal = round2(taxableCharges + nonTaxableCharges);

  // Invoice-level extra discount is computed on line taxable amount only
  // (consistent with GST: discounts post-supply reduce value, but we keep
  // the tax base as line taxable + taxable charges).
  const invoiceDiscount = computeInvoiceDiscount(
    lineTaxable,
    invoice?.extraDiscountType,
    invoice?.extraDiscountValue
  );

  const taxableAmount = round2(lineTaxable - invoiceDiscount + taxableCharges);

  // Tax split uses a blended rate: weighted by each line's taxable share so
  // mixed-rate invoices stay correct. `sameState` is derived by the caller
  // from company/customer state and passed in.
  const sameState = !!invoice?.sameState;
  const blendedRate = lineTaxable > 0
    ? round2(rows.reduce((s, r) => s + r.taxable * (Number(r.taxRate) || 0), 0) / lineTaxable)
    : 0;
  // Tax applies to (lineTaxable - invoiceDiscount) + taxableCharges.
  const taxBase = round2(lineTaxable - invoiceDiscount + taxableCharges);
  const tax = splitTax(taxBase, blendedRate, sameState);

  const discountTotal = round2(lineDiscountTotal + invoiceDiscount);
  const taxTotal = tax.total;
  const beforeRound = round2(taxableAmount + taxTotal + nonTaxableCharges);
  const roundOff = invoice?.roundOff ? round2(beforeRound - Math.floor(beforeRound)) : 0;
  const grandTotal = invoice?.roundOff ? round2(Math.floor(beforeRound) + 1) : beforeRound;
  // When rounding is off, roundOff is 0 and grandTotal equals beforeRound.

  // Payments.
  const amountPaid = round2((invoice?.payments || []).reduce((s, p) => s + (Number(p?.amount) || 0), 0));
  const balanceDue = round2(grandTotal - amountPaid);

  return {
    rows,
    subtotal,
    lineDiscountTotal,
    invoiceDiscount,
    discountTotal,
    taxableAmount,
    taxableCharges,
    nonTaxableCharges,
    additionalChargesTotal,
    cgst: tax.cgst,
    sgst: tax.sgst,
    igst: tax.igst,
    taxTotal,
    beforeRound,
    roundOff,
    grandTotal,
    amountPaid,
    balanceDue,
  };
}

export { round2 };
