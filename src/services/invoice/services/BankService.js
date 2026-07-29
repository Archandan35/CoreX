import { api } from '../../api.js';
import { asJson } from './utils.js';

export class BankService {
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
}

export const bankService = new BankService();
