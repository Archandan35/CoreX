import { getSupabaseClient } from '../../../identity/auth/supabaseClient.js';
import { settingsApiService } from '../../settings/SettingsApiService.js';
import { INVOICE_TABLE_COLUMNS } from '../../../constants/index.js';

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
    await settingsApiService.update({ documentSettings: updates });
    return true;
  }

  async getColumnDefinitions() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('settings').select('value').eq('key', '_product_columns').maybeSingle();
    if (error || !data) return INVOICE_TABLE_COLUMNS;
    try {
      const columns = JSON.parse(data.value);
      return Array.isArray(columns) && columns.length ? columns : INVOICE_TABLE_COLUMNS;
    } catch {
      return INVOICE_TABLE_COLUMNS;
    }
  }

  async listDocumentTypes() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('document_type_master').select('name').order('name', { ascending: true });
    if (error || !data) return [];
    return data.map(r => r.name);
  }
}

export const settingsService = new SettingsService();
