import { api } from '../../api.js';
import { asJson } from './utils.js';

export class SuffixService {
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
}

export const suffixService = new SuffixService();
