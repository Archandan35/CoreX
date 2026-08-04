import { api } from '../api.js';
import { getSupabaseClient } from '../../identity/auth/supabaseClient.js';
import { jsPDF } from 'jspdf';
import { aiService } from '../ai/AiService.js';
import { asJson } from './services/utils.js';
import { generateSimpleDocPdf, generateInvoicePdf } from './pdfGenerator.js';

import { customerService } from './services/CustomerService.js';
import { productService } from './services/ProductService.js';
import { bankService } from './services/BankService.js';
import { signatureService } from './services/SignatureService.js';
import { prefixService } from './services/PrefixService.js';
import { suffixService } from './services/SuffixService.js';
import { customHeaderService } from './services/CustomHeaderService.js';
import { documentNoteService } from './services/DocumentNoteService.js';
import { companyService } from './services/CompanyService.js';
import { settingsService } from './services/SettingsService.js';

function nextInvoiceNumber(prefix, lastNumber) {
  if (!lastNumber) {
    return `${prefix}-1`;
  }
  const regex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-?(\\d+)`);
  const match = lastNumber.match(regex);
  const num = match ? parseInt(match[1], 10) : 0;
  return `${prefix}-${num + 1}`;
}

function computeInvoiceStatus(invoice) {
  const total = Number(invoice.grand_total) || 0;
  const paid = Number(invoice.amount_paid) || 0;
  const due = invoice.due_date ? new Date(invoice.due_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (invoice.status === 'cancelled' || invoice.status === 'refunded' || invoice.status === 'void') return invoice.status;
  if (paid >= total && total > 0) return 'paid';
  if (paid > 0 && paid < total) return 'partially_paid';
  if ((invoice.status === 'sent' || invoice.status === 'pending' || invoice.status === 'partially_paid') && due && due < today) return 'overdue';
  return invoice.status || 'draft';
}

function makeId() {
  return crypto.randomUUID();
}

function nowISO() {
  return new Date().toISOString();
}

export class InvoiceService {
  // --- Re-exported domain services ---------------------------------------
  get listCustomers() { return customerService.listCustomers.bind(customerService); }
  get createCustomer() { return customerService.createCustomer.bind(customerService); }
  get updateCustomer() { return customerService.updateCustomer.bind(customerService); }
  get getCustomerOutstanding() { return customerService.getCustomerOutstanding.bind(customerService); }

  get listProducts() { return productService.listProducts.bind(productService); }
  get createProduct() { return productService.createProduct.bind(productService); }
  get updateProduct() { return productService.updateProduct.bind(productService); }
  get deleteProduct() { return productService.deleteProduct.bind(productService); }
  get listProductCategories() { return productService.listProductCategories.bind(productService); }
  get createProductCategory() { return productService.createProductCategory.bind(productService); }
  get updateProductCategory() { return productService.updateProductCategory.bind(productService); }
  get deleteProductCategory() { return productService.deleteProductCategory.bind(productService); }
  get listBrands() { return productService.listBrands.bind(productService); }
  get createBrand() { return productService.createBrand.bind(productService); }
  get updateBrand() { return productService.updateBrand.bind(productService); }
  get deleteBrand() { return productService.deleteBrand.bind(productService); }
  get listUnits() { return productService.listUnits.bind(productService); }
  get createUnit() { return productService.createUnit.bind(productService); }
  get updateUnit() { return productService.updateUnit.bind(productService); }
  get deleteUnit() { return productService.deleteUnit.bind(productService); }
  get setPrimaryUnit() { return productService.setPrimaryUnit.bind(productService); }
  get listWarehouses() { return productService.listWarehouses.bind(productService); }
  get createWarehouse() { return productService.createWarehouse.bind(productService); }
  get updateWarehouse() { return productService.updateWarehouse.bind(productService); }
  get deleteWarehouse() { return productService.deleteWarehouse.bind(productService); }
  get listTaxRates() { return productService.listTaxRates.bind(productService); }
  get createTaxRate() { return productService.createTaxRate.bind(productService); }
  get updateTaxRate() { return productService.updateTaxRate.bind(productService); }
  get deleteTaxRate() { return productService.deleteTaxRate.bind(productService); }
  get setDefaultTaxRate() { return productService.setDefaultTaxRate.bind(productService); }
  get listItemGroups() { return productService.listItemGroups.bind(productService); }
  get createItemGroup() { return productService.createItemGroup.bind(productService); }
  get updateItemGroup() { return productService.updateItemGroup.bind(productService); }
  get deleteItemGroup() { return productService.deleteItemGroup.bind(productService); }
  get listManufacturers() { return productService.listManufacturers.bind(productService); }
  get createManufacturer() { return productService.createManufacturer.bind(productService); }
  get updateManufacturer() { return productService.updateManufacturer.bind(productService); }
  get deleteManufacturer() { return productService.deleteManufacturer.bind(productService); }
  get listSuppliers() { return productService.listSuppliers.bind(productService); }
  get createSupplier() { return productService.createSupplier.bind(productService); }
  get updateSupplier() { return productService.updateSupplier.bind(productService); }
  get deleteSupplier() { return productService.deleteSupplier.bind(productService); }
  get listSupplierCategories() { return productService.listSupplierCategories.bind(productService); }
  get createSupplierCategory() { return productService.createSupplierCategory.bind(productService); }
  get updateSupplierCategory() { return productService.updateSupplierCategory.bind(productService); }
  get deleteSupplierCategory() { return productService.deleteSupplierCategory.bind(productService); }
  get listPriceLists() { return productService.listPriceLists.bind(productService); }
  get getProductPriceLists() { return productService.getProductPriceLists.bind(productService); }
  get saveProductPriceLists() { return productService.saveProductPriceLists.bind(productService); }

  get listBanks() { return bankService.listBanks.bind(bankService); }
  get createBank() { return bankService.createBank.bind(bankService); }
  get updateBank() { return bankService.updateBank.bind(bankService); }
  get deleteBank() { return bankService.deleteBank.bind(bankService); }

  get listSignatures() { return signatureService.listSignatures.bind(signatureService); }
  get createSignature() { return signatureService.createSignature.bind(signatureService); }
  get deleteSignature() { return signatureService.deleteSignature.bind(signatureService); }

  get listPrefixes() { return prefixService.listPrefixes.bind(prefixService); }
  get createPrefix() { return prefixService.createPrefix.bind(prefixService); }
  get updatePrefix() { return prefixService.updatePrefix.bind(prefixService); }
  get deletePrefix() { return prefixService.deletePrefix.bind(prefixService); }
  get setDefaultPrefix() { return prefixService.setDefaultPrefix.bind(prefixService); }

  get listSuffixes() { return suffixService.listSuffixes.bind(suffixService); }
  get createSuffix() { return suffixService.createSuffix.bind(suffixService); }
  get updateSuffix() { return suffixService.updateSuffix.bind(suffixService); }
  get deleteSuffix() { return suffixService.deleteSuffix.bind(suffixService); }
  get setDefaultSuffix() { return suffixService.setDefaultSuffix.bind(suffixService); }

  get listCustomHeaders() { return customHeaderService.listCustomHeaders.bind(customHeaderService); }
  get createCustomHeader() { return customHeaderService.createCustomHeader.bind(customHeaderService); }
  get updateCustomHeader() { return customHeaderService.updateCustomHeader.bind(customHeaderService); }
  get deleteCustomHeader() { return customHeaderService.deleteCustomHeader.bind(customHeaderService); }

  get listNotes() { return documentNoteService.listNotes.bind(documentNoteService); }
  get createNote() { return documentNoteService.createNote.bind(documentNoteService); }
  get updateNote() { return documentNoteService.updateNote.bind(documentNoteService); }
  get deleteNote() { return documentNoteService.deleteNote.bind(documentNoteService); }
  get listTerms() { return documentNoteService.listTerms.bind(documentNoteService); }
  get createTerm() { return documentNoteService.createTerm.bind(documentNoteService); }
  get updateTerm() { return documentNoteService.updateTerm.bind(documentNoteService); }
  get deleteTerm() { return documentNoteService.deleteTerm.bind(documentNoteService); }

  get listCompanies() { return companyService.listCompanies.bind(companyService); }
  get getCurrentCompany() { return companyService.getCurrentCompany.bind(companyService); }

  get getDocumentSettings() { return settingsService.getDocumentSettings.bind(settingsService); }
  get saveDocumentSettings() { return settingsService.saveDocumentSettings.bind(settingsService); }
  get getColumnDefinitions() { return settingsService.getColumnDefinitions.bind(settingsService); }
  get listDocumentTypes() { return settingsService.listDocumentTypes.bind(settingsService); }

  // --- Invoice CRUD (direct Supabase) ---------------------------------
  async checkDuplicateNumber(prefix, invoiceNumber, excludeId) {
    if (!prefix || !invoiceNumber) return { available: true };
    const supabase = await getSupabaseClient();
    let q = supabase.from('invoices').select('id').eq('invoice_number', invoiceNumber);
    if (excludeId) q = q.neq('id', excludeId);
    const { data } = await q.limit(1);
    return { available: !(data && data.length > 0) };
  }

  async nextInvoiceNumber(prefix) {
    const supabase = await getSupabaseClient();
    const p = prefix || 'INV-';
    const { data } = await supabase.from('invoices').select('invoice_number').like('invoice_number', `${p}%`).order('invoice_number', { ascending: false }).limit(1);
    return { number: nextInvoiceNumber(p, data?.[0]?.invoice_number) };
  }

  async listInvoices() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('invoices').select('*, customer:customers(id,name,company)').order('created_at', { ascending: false });
    return error ? [] : (data || []);
  }

  async getInvoice(id) {
    const supabase = await getSupabaseClient();
    const [ir, items, pays] = await Promise.all([
      supabase.from('invoices').select('*, customer:customers(*)').eq('id', id).single(),
      supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order', { ascending: true }),
      supabase.from('invoice_payments').select('*').eq('invoice_id', id).order('created_at', { ascending: true }),
    ]);
    if (ir.error || !ir.data) throw new Error('Invoice not found.');
    const invoice = { ...ir.data, items: items.data || [], payments: pays.data || [] };
    invoice.status = computeInvoiceStatus(invoice);
    return invoice;
  }

  async saveInvoice(invoice) {
    const supabase = await getSupabaseClient();
    const isEdit = !!invoice.id;
    const { items, payments, ...invoiceRow } = invoice;

    // Duplicate check
    let q = supabase.from('invoices').select('id').eq('invoice_number', invoiceRow.invoice_number);
    if (isEdit) q = q.neq('id', invoice.id);
    const { data: dup } = await q.limit(1);
    if (dup && dup.length) throw new Error('Invoice number already exists.');

    // Compute status
    const totalPaid = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    let status = invoiceRow.status || 'draft';
    if (status !== 'draft' && totalPaid > 0) {
      const total = Number(invoiceRow.grand_total) || 0;
      status = totalPaid >= total ? 'paid' : 'partially_paid';
    }
    invoiceRow.status = status;
    invoiceRow.amount_paid = totalPaid;
    invoiceRow.balance_due = Math.max(0, (Number(invoiceRow.grand_total) || 0) - totalPaid);

    const execSql = async (sql) => {
      const { error } = await supabase.rpc('exec_sql', { query_text: sql });
      if (error) throw new Error(error.message);
    };

    if (isEdit) {
      // Fetch old invoice for side-effect reversal
      const { data: oldInv } = await supabase.from('invoices').select('*, items:invoice_items(*)').eq('id', invoice.id).single();
      if (!oldInv) throw new Error('Invoice not found.');
      const oldItems = oldInv.items || [];

      // Update invoice row
      const { data: inv, error: ie } = await supabase.from('invoices').update(invoiceRow).eq('id', invoice.id).select().single();
      if (ie || !inv) throw new Error('Invoice not found.');

      // Replace items
      await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id);
      if (items?.length) {
        await supabase.from('invoice_items').insert(items.map((it, i) => ({ ...it, id: crypto.randomUUID(), invoice_id: invoice.id, sort_order: it.sort_order ?? i })));
      }

      // Replace payments
      await supabase.from('invoice_payments').delete().eq('invoice_id', invoice.id);
      if (payments?.length) {
        await supabase.from('invoice_payments').insert(payments.map((p) => ({ ...p, id: crypto.randomUUID(), invoice_id: invoice.id })));
      }

      // Restore old stock, reserve new stock
      for (const item of oldItems) {
        if (!item.product_id) continue;
        const qty = Number(item.quantity) || 0;
        if (qty > 0) await execSql(`UPDATE products SET stock_quantity = GREATEST(0, stock_quantity + ${qty}) WHERE id = '${item.product_id}'`);
      }
      for (const item of (items || [])) {
        if (!item.product_id) continue;
        const qty = Number(item.quantity) || 0;
        if (qty > 0) await execSql(`UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ${qty}) WHERE id = '${item.product_id}'`);
      }

      // Customer balance
      if (oldInv.customer_id) {
        const oldG = Number(oldInv.grand_total) || 0;
        const oldP = Number(oldInv.amount_paid) || 0;
        await execSql(`UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance - ${oldG - oldP}), total_purchases = GREATEST(0, total_purchases - ${oldG}) WHERE id = '${oldInv.customer_id}'`);
      }
      if (invoiceRow.customer_id) {
        const newG = Number(invoiceRow.grand_total) || 0;
        await execSql(`UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance + ${newG - totalPaid}), total_purchases = GREATEST(0, total_purchases + ${newG}) WHERE id = '${invoiceRow.customer_id}'`);
      }

      // Delete and recreate accounting entries
      await execSql(`DELETE FROM accounting_entries WHERE invoice_id = '${invoice.id}'`);
      await createAccountingEntries(supabase, execSql, invoice.id, invoiceRow);

      return inv;
    } else {
      // Create
      invoiceRow.id = makeId();
      invoiceRow.created_at = nowISO();
      invoiceRow.updated_at = invoiceRow.created_at;

      const { data: inv, error: ie } = await supabase.from('invoices').insert(invoiceRow).select().single();
      if (ie) throw new Error(ie.message);

      if (items?.length) {
        await supabase.from('invoice_items').insert(items.map((it, i) => ({ ...it, id: crypto.randomUUID(), invoice_id: inv.id, sort_order: it.sort_order ?? i })));
      }
      if (payments?.length) {
        await supabase.from('invoice_payments').insert(payments.map((p) => ({ ...p, id: crypto.randomUUID(), invoice_id: inv.id })));
      }

      // Stock reserve
      for (const item of (items || [])) {
        if (!item.product_id) continue;
        const qty = Number(item.quantity) || 0;
        if (qty > 0) await execSql(`UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ${qty}) WHERE id = '${item.product_id}'`);
      }

      // Customer balance
      if (invoiceRow.customer_id) {
        const g = Number(invoiceRow.grand_total) || 0;
        await execSql(`UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance + ${g - totalPaid}), total_purchases = GREATEST(0, total_purchases + ${g}) WHERE id = '${invoiceRow.customer_id}'`);
      }

      // Accounting entries
      await createAccountingEntries(supabase, execSql, inv.id, invoiceRow);

      return inv;
    }
  }

  async deleteInvoice(id) {
    const supabase = await getSupabaseClient();
    const { data: oldInv } = await supabase.from('invoices').select('*, items:invoice_items(*)').eq('id', id).single();
    if (!oldInv) throw new Error('Invoice not found.');
    if (oldInv.status === 'paid') throw new Error('Cannot delete a paid invoice. Cancel or refund instead.');
    if (oldInv.status === 'refunded' || oldInv.status === 'void') throw new Error('Invoice already finalized.');

    await supabase.from('invoices').update({ status: 'cancelled', updated_at: nowISO() }).eq('id', id);

    // Restore stock
    const oldItems = oldInv.items || [];
    const execSql = async (sql) => {
      const { error } = await supabase.rpc('exec_sql', { query_text: sql });
      if (error) throw new Error(error.message);
    };
    for (const item of oldItems) {
      if (!item.product_id) continue;
      const qty = Number(item.quantity) || 0;
      if (qty > 0) await execSql(`UPDATE products SET stock_quantity = GREATEST(0, stock_quantity + ${qty}) WHERE id = '${item.product_id}'`);
    }

    // Reverse customer balance
    if (oldInv.customer_id) {
      const g = Number(oldInv.grand_total) || 0;
      const p = Number(oldInv.amount_paid) || 0;
      await execSql(`UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance - ${g - p}), total_purchases = GREATEST(0, total_purchases - ${g}) WHERE id = '${oldInv.customer_id}'`);
    }

    // Void accounting entries
    await execSql(`DELETE FROM accounting_entries WHERE invoice_id = '${id}'`);

    return true;
  }

  async duplicateInvoice(id) {
    const supabase = await getSupabaseClient();
    const { data: original, error: fetchErr } = await supabase.from('invoices').select('*, items:invoice_items(*)').eq('id', id).single();
    if (fetchErr || !original) throw new Error('Invoice not found.');

    const p = original.prefix || 'INV-';
    const { data: last } = await supabase.from('invoices').select('invoice_number').like('invoice_number', `${p}%`).order('invoice_number', { ascending: false }).limit(1);
    const nextNum = nextInvoiceNumber(p, last?.[0]?.invoice_number);

    const newInv = {
      prefix: original.prefix, invoice_number: nextNum, customer_id: original.customer_id,
      invoice_date: nowISO().split('T')[0], due_date: original.due_date,
      reference: original.reference, custom_headers: original.custom_headers,
      notes: original.notes, terms: original.terms, attachments: original.attachments,
      reverse_charge: original.reverse_charge, create_ewaybill: original.create_ewaybill,
      create_einvoice: original.create_einvoice, tds_enabled: original.tds_enabled,
      tcs_enabled: original.tcs_enabled, extra_discount_type: original.extra_discount_type,
      extra_discount_value: original.extra_discount_value, round_off: original.round_off,
      bank_id: original.bank_id, signature_id: original.signature_id,
      subtotal: original.subtotal, discount_total: original.discount_total,
      taxable_amount: original.taxable_amount, cgst_total: original.cgst_total,
      sgst_total: original.sgst_total, igst_total: original.igst_total,
      tax_total: original.tax_total, additional_charges_total: original.additional_charges_total,
      grand_total: original.grand_total, amount_paid: 0, balance_due: original.grand_total,
      status: 'draft', id: makeId(), created_at: nowISO(), updated_at: nowISO(),
    };

    const { data: created, error: insertErr } = await supabase.from('invoices').insert(newInv).select().single();
    if (insertErr) throw new Error(insertErr.message);

    if (original.items?.length) {
      const newItems = original.items.map(item => ({
        id: crypto.randomUUID(), invoice_id: created.id, product_id: item.product_id, name: item.name,
        description: item.description, show_description: item.show_description,
        quantity: item.quantity, unit_price: item.unit_price, tax_rate: item.tax_rate,
        discount_type: item.discount_type, discount_value: item.discount_value,
        discount_amount: item.discount_amount, tax_amount: item.tax_amount,
        line_total: item.line_total, sort_order: item.sort_order,
      }));
      const { error: itemsErr } = await supabase.from('invoice_items').insert(newItems);
      if (itemsErr) throw new Error(itemsErr.message);
    }

    return created;
  }

  async cancelInvoice(id) {
    const supabase = await getSupabaseClient();
    const { data: oldInv } = await supabase.from('invoices').select('*, items:invoice_items(*)').eq('id', id).single();
    if (!oldInv) throw new Error('Invoice not found.');

    await supabase.from('invoices').update({ status: 'cancelled', updated_at: nowISO() }).eq('id', id);

    const oldItems = oldInv.items || [];
    const execSql = async (sql) => {
      const { error } = await supabase.rpc('exec_sql', { query_text: sql });
      if (error) throw new Error(error.message);
    };
    for (const item of oldItems) {
      if (!item.product_id) continue;
      const qty = Number(item.quantity) || 0;
      if (qty > 0) await execSql(`UPDATE products SET stock_quantity = GREATEST(0, stock_quantity + ${qty}) WHERE id = '${item.product_id}'`);
    }
    if (oldInv.customer_id) {
      const g = Number(oldInv.grand_total) || 0;
      const p = Number(oldInv.amount_paid) || 0;
      await execSql(`UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance - ${g - p}), total_purchases = GREATEST(0, total_purchases - ${g}) WHERE id = '${oldInv.customer_id}'`);
    }
    await execSql(`DELETE FROM accounting_entries WHERE invoice_id = '${id}'`);
    return true;
  }

  async markAsPaid(id, payload) {
    const supabase = await getSupabaseClient();
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single();
    if (!inv) throw new Error('Invoice not found.');

    const paymentAmount = Number(payload.amount) || Number(inv.grand_total) || 0;
    const newPaid = (Number(inv.amount_paid) || 0) + paymentAmount;
    const newBalance = Math.max(0, (Number(inv.grand_total) || 0) - newPaid);
    const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
    const paidAt = payload.paid_at || nowISO();

    await supabase.from('invoices').update({
      amount_paid: newPaid,
      balance_due: newBalance,
      status: newStatus,
      updated_at: nowISO(),
    }).eq('id', id);

    await supabase.from('invoice_payments').insert({
      id: makeId(),
      invoice_id: id,
      amount: paymentAmount,
      method: payload.payment_method || 'bank_transfer',
      reference: payload.reference || '',
      paid_at: paidAt,
      created_at: nowISO(),
    });

    const execSql = async (sql) => {
      const { error } = await supabase.rpc('exec_sql', { query_text: sql });
      if (error) throw new Error(error.message);
    };
    if (inv.customer_id) {
      await execSql(`UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance - ${paymentAmount}) WHERE id = '${inv.customer_id}'`);
    }

    return { ...inv, amount_paid: newPaid, balance_due: newBalance, status: newStatus };
  }

  async convertInvoice(id) {
    const r = await asJson(await api(`/api/invoices/${id}/convert`, { method: 'POST' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to convert invoice.');
    return r.data.invoice;
  }

  async linkToSubscription(id) {
    const r = await asJson(await api(`/api/invoices/${id}/link-subscription`, { method: 'POST' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to link subscription.');
    return r.data;
  }

  async digitalSignPdf(id) {
    const r = await asJson(await api(`/api/invoices/${id}/digital-sign`, { method: 'POST' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to digitally sign PDF.');
    return r.data;
  }

  async bulkDownloadPdfs(ids) {
    const supabase = await getSupabaseClient();
    const { data: companyData } = await supabase.from('companies').select('*').maybeSingle();
    for (const id of ids) {
      const invoice = await this.getInvoice(id);
      const pdf = generateInvoicePdf({ ...invoice, company: companyData });
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice.invoice_number || id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      await new Promise(r => setTimeout(r, 300));
    }
    return { ok: true };
  }

  async generateShippingLabel(id) {
    const r = await asJson(await api(`/api/invoices/${id}/shipping-label`, { method: 'POST' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to generate shipping label.');
    return r.data;
  }

  async generateDeliveryChallan(id) {
    const invoice = await this.getInvoice(id);
    const supabase = await getSupabaseClient();
    const { data: companyData } = await supabase.from('companies').select('*').maybeSingle();
    const doc = generateSimpleDocPdf('Delivery Challan', 'Delivery Challan', { ...invoice, company: companyData });
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Delivery_Challan_${invoice.invoice_number || id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    return { url };
  }

  async createPackingList(id) {
    const invoice = await this.getInvoice(id);
    const supabase = await getSupabaseClient();
    const { data: companyData } = await supabase.from('companies').select('*').maybeSingle();
    const doc = generateSimpleDocPdf('Packing List', 'Packing List', { ...invoice, company: companyData });
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Packing_List_${invoice.invoice_number || id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    return { url };
  }

  async createEwayBill(id) {
    const r = await asJson(await api(`/api/invoices/${id}/eway-bill`, { method: 'POST' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to create e-way bill.');
    return r.data;
  }

  async createEInvoice(id) {
    const r = await asJson(await api(`/api/invoices/${id}/e-invoice`, { method: 'POST' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to create e-invoice.');
    return r.data;
  }

  async exportInvoicesCsv(filters = {}) {
    const supabase = await getSupabaseClient();
    let q = supabase.from('invoices').select('*, customer:customers(id,name,company)').order('created_at', { ascending: false });
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.customer_id) q = q.eq('customer_id', filters.customer_id);
    if (filters.start_date) q = q.gte('invoice_date', filters.start_date);
    if (filters.end_date) q = q.lte('invoice_date', filters.end_date);
    const { data, error } = await q;
    if (error) return '';
    const rows = data || [];
    const header = 'Invoice Number,Customer,Date,Due Date,Status,Grand Total,Amount Paid,Balance Due';
    const csv = rows.map(r =>
      `"${r.invoice_number}","${r.customer?.name || ''}","${r.invoice_date || ''}","${r.due_date || ''}","${r.status || ''}",${r.grand_total || 0},${r.amount_paid || 0},${r.balance_due || 0}`
    );
    return [header, ...csv].join('\n');
  }

  async exportInvoicesPdf(filters = {}) {
    const supabase = await getSupabaseClient();
    let q = supabase.from('invoices').select('*, customer:customers(id,name,company)').order('created_at', { ascending: false });
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.customer_id) q = q.eq('customer_id', filters.customer_id);
    if (filters.start_date) q = q.gte('invoice_date', filters.start_date);
    if (filters.end_date) q = q.lte('invoice_date', filters.end_date);
    const { data } = await q;
    const rows = data || [];

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoices Export', pageW / 2, y, { align: 'center' });
    y += 10;

    for (const inv of rows) {
      if (y > 250) { doc.addPage(); y = margin; }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${inv.invoice_number} - ${inv.customer?.name || ''}`, margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Date: ${inv.invoice_date || ''}  Status: ${inv.status || ''}  Total: ₹${Number(inv.grand_total || 0).toFixed(2)}`, margin, y);
      y += 8;
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Invoices_Export.pdf';
    a.click();
    URL.revokeObjectURL(url);
    return { url };
  }

  async downloadPdf(id) {
    const invoice = await this.getInvoice(id);
    const supabase = await getSupabaseClient();
    const { data: companyData } = await supabase.from('companies').select('*').maybeSingle();
    const pdf = generateInvoicePdf({ ...invoice, company: companyData });
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${invoice.invoice_number || id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    return { url };
  }

  async sendInvoice(id, method) {
    const r = await asJson(await api(`/api/invoices/${id}/send`, {
      method: 'POST', body: JSON.stringify({ method }),
    }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to send invoice.');
    return r.data;
  }

  // --- AI helpers -------------------------------------------------------
  async draftInvoiceWithAI(context) {
    const messages = [
      { role: 'system', content: 'You are an invoicing assistant. Given a free-text request, return only a JSON object with customer, items (name, quantity, unitPrice, taxRate), notes, and terms.' },
      { role: 'user', content: context },
    ];
    const res = await aiService.chat(messages, { response_format: 'json' });
    const text = res?.choices?.[0]?.message?.content || '';
    try { return JSON.parse(text); } catch { return null; }
  }

  async suggestNote(existingNotes, intent) {
    const res = await aiService.chat([
      { role: 'system', content: 'Write a concise professional invoice note.' },
      { role: 'user', content: `Intent: ${intent}. Existing notes: ${existingNotes || 'none'}` },
    ]);
    return res?.choices?.[0]?.message?.content || '';
  }
}

async function createAccountingEntries(supabase, execSql, invoiceId, payload) {
  const entries = [];
  const id = () => makeId();
  entries.push({ id: id(), invoice_id: invoiceId, entry_type: 'debit', account_name: 'Accounts Receivable', amount: payload.grand_total || 0, description: `Invoice ${payload.invoice_number}`, created_at: nowISO() });
  entries.push({ id: id(), invoice_id: invoiceId, entry_type: 'credit', account_name: 'Sales Income', amount: payload.subtotal || 0, description: `Invoice ${payload.invoice_number} - Subtotal`, created_at: nowISO() });
  if (payload.cgst_total > 0) entries.push({ id: id(), invoice_id: invoiceId, entry_type: 'credit', account_name: 'CGST Payable', amount: payload.cgst_total, description: `Invoice ${payload.invoice_number}`, created_at: nowISO() });
  if (payload.sgst_total > 0) entries.push({ id: id(), invoice_id: invoiceId, entry_type: 'credit', account_name: 'SGST Payable', amount: payload.sgst_total, description: `Invoice ${payload.invoice_number}`, created_at: nowISO() });
  if (payload.igst_total > 0) entries.push({ id: id(), invoice_id: invoiceId, entry_type: 'credit', account_name: 'IGST Payable', amount: payload.igst_total, description: `Invoice ${payload.invoice_number}`, created_at: nowISO() });
  if (payload.additional_charges_total > 0) entries.push({ id: id(), invoice_id: invoiceId, entry_type: 'credit', account_name: 'Other Charges', amount: payload.additional_charges_total, description: `Invoice ${payload.invoice_number}`, created_at: nowISO() });
  if (entries.length) await supabase.from('accounting_entries').insert(entries);
}

export const invoiceService = new InvoiceService();
