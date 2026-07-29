import { api } from '../../api.js';
import { asJson } from './utils.js';

export class PrefixService {
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
}

export const prefixService = new PrefixService();
