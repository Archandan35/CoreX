import { api } from '../../api.js';
import { asJson } from './utils.js';

export class SignatureService {
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
}

export const signatureService = new SignatureService();
