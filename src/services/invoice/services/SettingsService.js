import { api } from '../../api.js';
import { settingsApiService } from '../../settings/SettingsApiService.js';
import { INVOICE_TABLE_COLUMNS } from '../../../constants/index.js';
import { asJson } from './utils.js';

export class SettingsService {
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

  async getColumnDefinitions() {
    const r = await asJson(await api('/api/product-columns'));
    if (!r.ok) { return INVOICE_TABLE_COLUMNS; }
    const columns = r.data.columns || r.data || [];
    return Array.isArray(columns) && columns.length ? columns : INVOICE_TABLE_COLUMNS;
  }

  async listDocumentTypes() {
    const r = await asJson(await api('/api/document-types'));
    return r.ok ? (r.data.types || r.data || []) : [];
  }
}

export const settingsService = new SettingsService();
