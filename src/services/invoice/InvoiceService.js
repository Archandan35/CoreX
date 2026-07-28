// ---------------------------------------------------------------------------
// InvoiceService — provider-agnostic client for the invoice domain.
// Pages import this, never the database/storage/AI providers directly. All
// persistence flows through the existing `api()` wrapper to /api/* endpoints
// which enforce server-side authorization; attachments use the existing
// FileService/storage layer; AI helpers delegate to the existing aiService.
// ---------------------------------------------------------------------------

import { api } from '../api.js';
import { aiService } from '../ai/AiService.js';
import { settingsApiService } from '../settings/SettingsApiService.js';

async function asJson(res) {
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
  return { ok: res.ok, status: res.status, data };
}

export class InvoiceService {
  // --- Customers ---------------------------------------------------------
  async listCustomers(query) {
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    const r = await asJson(await api(`/api/customers${q}`));
    return r.ok ? r.data.customers || [] : [];
  }
  async createCustomer(payload) {
    const r = await asJson(await api('/api/customers', { method: 'POST', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to create customer.');
    return r.data.customer;
  }
  async updateCustomer(id, payload) {
    const r = await asJson(await api(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to update customer.');
    return r.data.customer;
  }

  // --- Products & categories --------------------------------------------
  async listProducts() {
    const r = await asJson(await api('/api/products'));
    if (!r.ok) return { products: [], categories: [] };
    return { products: r.data.products || [], categories: r.data.categories || [] };
  }
  async createProduct(payload) {
    const r = await asJson(await api('/api/products', { method: 'POST', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to create product.');
    return r.data.product;
  }
  async updateProduct(id, payload) {
    const r = await asJson(await api(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to update product.');
    return r.data.product;
  }

  // --- Banks -------------------------------------------------------------
  async listBanks() {
    const r = await asJson(await api('/api/banks'));
    return r.ok ? r.data.banks || [] : [];
  }
  async createBank(payload) {
    const r = await asJson(await api('/api/banks', { method: 'POST', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to add bank.');
    return r.data.bank;
  }
  async updateBank(id, payload) {
    const r = await asJson(await api(`/api/banks/${id}`, { method: 'PUT', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to update bank.');
    return r.data.bank;
  }
  async deleteBank(id) {
    const r = await asJson(await api(`/api/banks/${id}`, { method: 'DELETE' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to remove bank.');
    return true;
  }

  // --- Signatures --------------------------------------------------------
  async listSignatures() {
    const r = await asJson(await api('/api/signatures'));
    return r.ok ? r.data.signatures || [] : [];
  }
  async createSignature(payload) {
    const r = await asJson(await api('/api/signatures', { method: 'POST', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to add signature.');
    return r.data.signature;
  }
  async deleteSignature(id) {
    const r = await asJson(await api(`/api/signatures/${id}`, { method: 'DELETE' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to remove signature.');
    return true;
  }

  // --- Invoices ----------------------------------------------------------
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
    return r.data.invoice;
  }
  async deleteInvoice(id) {
    const r = await asJson(await api(`/api/invoices/${id}`, { method: 'DELETE' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to delete invoice.');
    return true;
  }

  // --- AI ----------------------------------------------------------------
  // Delegates to the application's existing provider-agnostic AI service so
  // the page never imports an AI provider directly.
  async draftInvoiceWithAI(context) {
    const messages = [
      { role: 'system', content: 'You are an invoicing assistant. Given a free-text request, return only a JSON object with customer, items (name, quantity, unitPrice, taxRate), notes, and terms.' },
      { role: 'user', content: context },
    ];
    const res = await aiService.chat(messages, { response_format: 'json' });
    const text = res?.choices?.[0]?.message?.content || '';
    try { return JSON.parse(text); } catch { return null; }
  }
  // --- Exports ----------------------------------------------------------
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
  async suggestNote(existingNotes, intent) {
    const res = await aiService.chat([
      { role: 'system', content: 'Write a concise professional invoice note.' },
      { role: 'user', content: `Intent: ${intent}. Existing notes: ${existingNotes || 'none'}` },
    ]);
    return res?.choices?.[0]?.message?.content || '';
  }

  // --- Document settings ------------------------------------------------
  // Persisted as a single JSON blob under the `documentSettings` key via the
  // generic /api/settings endpoint so we don't need a new backend route.
  async getDocumentSettings() {
    const all = await settingsApiService.getAll();
    const raw = all?.settings?.documentSettings ?? all?.documentSettings;
    let doc = raw || {};
    if (typeof doc === 'string') {
      try { doc = JSON.parse(doc); } catch { doc = {}; }
    }
    return doc && typeof doc === 'object' ? doc : {};
  }
  async saveDocumentSettings(updates) {
    const r = await asJson(await api('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ documentSettings: updates }),
    }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to save document settings.');
    return true;
  }

  // --- Document types (from master config) ------------------------------
  async listDocumentTypes() {
    const r = await asJson(await api('/api/document-types'));
    return r.ok ? (r.data.types || r.data || []) : [];
  }

  // --- Prefixes ---------------------------------------------------------
  async listPrefixes(params = {}) {
    const q = Object.keys(params).length ? `?${new URLSearchParams(params)}` : '';
    const r = await asJson(await api(`/api/prefix-settings${q}`));
    return r.ok ? r.data : { items: [], total: 0 };
  }
  async createPrefix(payload) {
    const r = await asJson(await api('/api/prefix-settings', { method: 'POST', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to create prefix.');
    return r.data.prefix;
  }
  async updatePrefix(id, payload) {
    const r = await asJson(await api(`/api/prefix-settings/${id}`, { method: 'PUT', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to update prefix.');
    return r.data.prefix;
  }
  async deletePrefix(id) {
    const r = await asJson(await api(`/api/prefix-settings/${id}`, { method: 'DELETE' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to delete prefix.');
    return true;
  }
  async setDefaultPrefix(id) {
    const r = await asJson(await api(`/api/prefix-settings/${id}/default`, { method: 'POST' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to set default prefix.');
    return r.data.prefix;
  }

  // --- Suffixes ---------------------------------------------------------
  async listSuffixes(params = {}) {
    const q = Object.keys(params).length ? `?${new URLSearchParams(params)}` : '';
    const r = await asJson(await api(`/api/suffix-settings${q}`));
    return r.ok ? r.data : { items: [], total: 0 };
  }
  async createSuffix(payload) {
    const r = await asJson(await api('/api/suffix-settings', { method: 'POST', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to create suffix.');
    return r.data.suffix;
  }
  async updateSuffix(id, payload) {
    const r = await asJson(await api(`/api/suffix-settings/${id}`, { method: 'PUT', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to update suffix.');
    return r.data.suffix;
  }
  async deleteSuffix(id) {
    const r = await asJson(await api(`/api/suffix-settings/${id}`, { method: 'DELETE' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to delete suffix.');
    return true;
  }
  async setDefaultSuffix(id) {
    const r = await asJson(await api(`/api/suffix-settings/${id}/default`, { method: 'POST' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to set default suffix.');
    return r.data.suffix;
  }

  // --- Custom Headers ---------------------------------------------------
  async listCustomHeaders(params = {}) {
    const q = Object.keys(params).length ? `?${new URLSearchParams(params)}` : '';
    const r = await asJson(await api(`/api/custom-headers${q}`));
    return r.ok ? r.data : { items: [], total: 0 };
  }
  async createCustomHeader(payload) {
    const r = await asJson(await api('/api/custom-headers', { method: 'POST', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to create custom header.');
    return r.data.header;
  }
  async updateCustomHeader(id, payload) {
    const r = await asJson(await api(`/api/custom-headers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to update custom header.');
    return r.data.header;
  }
  async deleteCustomHeader(id) {
    const r = await asJson(await api(`/api/custom-headers/${id}`, { method: 'DELETE' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to delete custom header.');
    return true;
  }
}

export const invoiceService = new InvoiceService();
