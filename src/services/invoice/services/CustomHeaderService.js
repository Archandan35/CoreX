import { api } from '../../api.js';
import { asJson } from './utils.js';

export class CustomHeaderService {
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

export const customHeaderService = new CustomHeaderService();
