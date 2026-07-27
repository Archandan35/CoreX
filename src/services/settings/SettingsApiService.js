import { api } from '../api.js';

async function asJson(res) {
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
  return { ok: res.ok, status: res.status, data };
}

export class SettingsApiService {
  async getAll() {
    const r = await asJson(await api('/api/settings'));
    return r.ok ? r.data || {} : {};
  }

  async update(updates) {
    const r = await asJson(await api('/api/settings', { method: 'PUT', body: JSON.stringify(updates) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to update settings.');
    return true;
  }
}

export const settingsApiService = new SettingsApiService();
