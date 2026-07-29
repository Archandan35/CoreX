import { api } from '../api.js';
import { aiService } from '../ai/AiService.js';
import { auditService } from '../../audit/AuditService.js';
import { asJson } from './services/utils.js';

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

export class InvoiceService {
  // --- Re-exported domain services ---------------------------------------
  get listCustomers() { return customerService.listCustomers.bind(customerService); }
  get createCustomer() { return customerService.createCustomer.bind(customerService); }
  get updateCustomer() { return customerService.updateCustomer.bind(customerService); }
  get getCustomerOutstanding() { return customerService.getCustomerOutstanding.bind(customerService); }

  get listProducts() { return productService.listProducts.bind(productService); }
  get createProduct() { return productService.createProduct.bind(productService); }
  get updateProduct() { return productService.updateProduct.bind(productService); }
  get listProductCategories() { return productService.listProductCategories.bind(productService); }
  get listBrands() { return productService.listBrands.bind(productService); }
  get listUnits() { return productService.listUnits.bind(productService); }
  get listWarehouses() { return productService.listWarehouses.bind(productService); }
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

  // --- Invoice-specific methods ------------------------------------------
  async checkDuplicateNumber(prefix, invoiceNumber, excludeId) {
    if (!prefix || !invoiceNumber) return { available: true };
    const params = new URLSearchParams({ prefix, number: invoiceNumber });
    if (excludeId) params.set('excludeId', excludeId);
    const r = await asJson(await api(`/api/invoices/check-number?${params}`));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to check duplicate number.');
    return r.data;
  }

  async nextInvoiceNumber(prefix) {
    const r = await asJson(await api(`/api/invoices/next-number${prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''}`));
    return r.ok ? r.data.number : null;
  }

  async listInvoices() {
    const r = await asJson(await api('/api/invoices'));
    return r.ok ? r.data.invoices || [] : [];
  }

  async getInvoice(id) {
    const r = await asJson(await api(`/api/invoices/${id}`));
    if (!r.ok) throw new Error(r.data?.error || 'Invoice not found.');
    return r.data.invoice;
  }

  async saveInvoice(invoice) {
    const isEdit = !!invoice.id;
    const r = await asJson(await api(
      isEdit ? `/api/invoices/${invoice.id}` : '/api/invoices',
      { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(invoice) }
    ));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to save invoice.');
    if (isEdit) {
      const before = await this.getInvoice(invoice.id);
      await auditService.logChange({ setting: 'invoice', oldValue: before, newValue: invoice, userId: null });
    } else {
      await auditService.logChange({ setting: 'invoice', oldValue: null, newValue: invoice, userId: null });
    }
    return r.data.invoice;
  }

  async deleteInvoice(id) {
    const r = await asJson(await api(`/api/invoices/${id}`, { method: 'DELETE' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to delete invoice.');
    return true;
  }

  async duplicateInvoice(id) {
    const r = await asJson(await api(`/api/invoices/${id}/duplicate`, { method: 'POST' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to duplicate invoice.');
    return r.data.invoice;
  }

  async cancelInvoice(id) {
    const r = await asJson(await api(`/api/invoices/${id}/cancel`, { method: 'POST' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to cancel invoice.');
    return r.data.invoice;
  }

  async markAsPaid(id, payload) {
    const r = await asJson(await api(`/api/invoices/${id}/mark-paid`, {
      method: 'POST', body: JSON.stringify(payload),
    }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to mark invoice as paid.');
    return r.data.invoice;
  }

  async downloadPdf(id) {
    const r = await asJson(await api(`/api/invoices/${id}/pdf`));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to download PDF.');
    return r.data;
  }

  async sendInvoice(id, method) {
    const r = await asJson(await api(`/api/invoices/${id}/send`, {
      method: 'POST', body: JSON.stringify({ method }),
    }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to send invoice.');
    return r.data;
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
    const r = await asJson(await api('/api/invoices/bulk-download-pdf', { method: 'POST', body: JSON.stringify({ ids }) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to bulk download PDFs.');
    return r.data;
  }

  async generateShippingLabel(id) {
    const r = await asJson(await api(`/api/invoices/${id}/shipping-label`, { method: 'POST' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to generate shipping label.');
    return r.data;
  }

  async generateDeliveryChallan(id) {
    const r = await asJson(await api(`/api/invoices/${id}/delivery-challan`, { method: 'POST' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to generate delivery challan.');
    return r.data;
  }

  async createPackingList(id) {
    const r = await asJson(await api(`/api/invoices/${id}/packing-list`, { method: 'POST' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to create packing list.');
    return r.data;
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

  async convertInvoice(id) {
    const r = await asJson(await api(`/api/invoices/${id}/convert`, { method: 'POST' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to convert invoice.');
    return r.data;
  }

  async exportInvoicesCsv(filters) {
    const q = filters ? `?${new URLSearchParams(filters)}` : '';
    const r = await asJson(await api(`/api/invoices/export/csv${q}`));
    if (!r.ok) throw new Error(r.data?.error || 'CSV export failed.');
    return r.data;
  }

  async exportInvoicesPdf(filters) {
    const q = filters ? `?${new URLSearchParams(filters)}` : '';
    const r = await asJson(await api(`/api/invoices/export/pdf${q}`));
    if (!r.ok) throw new Error(r.data?.error || 'PDF export failed.');
    return r.data;
  }

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

export const invoiceService = new InvoiceService();
