import { api } from '../../api.js';
import { asJson } from './utils.js';

export class DocumentNoteService {
  async listNotes(params = {}) {
    const q = Object.keys(params).length ? `?${new URLSearchParams(params)}` : '';
    const r = await asJson(await api(`/api/document-notes${q}`));
    return r.ok ? r.data : { items: [], total: 0 };
  }

  async createNote(payload) {
    const r = await asJson(await api('/api/document-notes', { method: 'POST', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to create note.');
    return r.data.note;
  }

  async updateNote(id, payload) {
    const r = await asJson(await api(`/api/document-notes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to update note.');
    return r.data.note;
  }

  async deleteNote(id) {
    const r = await asJson(await api(`/api/document-notes/${id}`, { method: 'DELETE' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to delete note.');
    return true;
  }

  async listTerms(params = {}) {
    const q = Object.keys(params).length ? `?${new URLSearchParams(params)}` : '';
    const r = await asJson(await api(`/api/document-terms${q}`));
    return r.ok ? r.data : { items: [], total: 0 };
  }

  async createTerm(payload) {
    const r = await asJson(await api('/api/document-terms', { method: 'POST', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to create term.');
    return r.data.term;
  }

  async updateTerm(id, payload) {
    const r = await asJson(await api(`/api/document-terms/${id}`, { method: 'PUT', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to update term.');
    return r.data.term;
  }

  async deleteTerm(id) {
    const r = await asJson(await api(`/api/document-terms/${id}`, { method: 'DELETE' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to delete term.');
    return true;
  }
}

export const documentNoteService = new DocumentNoteService();
