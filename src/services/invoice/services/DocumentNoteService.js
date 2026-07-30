import { getSupabaseClient } from '../../../identity/auth/supabaseClient.js';

async function loadItems(key) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
  if (error || !data) return [];
  try { return JSON.parse(data.value); } catch { return []; }
}

async function saveItems(key, items) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('settings').upsert(
    { key, value: JSON.stringify(items) },
    { onConflict: 'key' }
  );
  if (error) throw new Error(error.message);
}

function filterPage(items, params) {
  if (params.docType) items = items.filter(n => n.docType === params.docType);
  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter(n => (n.content || '').toLowerCase().includes(q));
  }
  const sortField = params.sortField || 'createdAt';
  const sortDir = params.sortDir || 'desc';
  items = [...items].sort((a, b) => {
    const va = a[sortField] ?? 0;
    const vb = b[sortField] ?? 0;
    if (typeof va === 'string') return sortDir === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb);
    return sortDir === 'desc' ? vb - va : va - vb;
  });
  const pageSize = parseInt(params.pageSize, 10) || 10;
  const pageNum = Math.max(1, parseInt(params.page, 10) || 1);
  const total = items.length;
  const paged = items.slice((pageNum - 1) * pageSize, pageNum * pageSize);
  return { items: paged, total };
}

class NoteService {
  constructor(key, label) {
    this.key = key;
    this.label = label;
  }

  async list(params = {}) {
    const items = await loadItems(this.key);
    return filterPage(items, params);
  }

  async create(payload) {
    const items = await loadItems(this.key);
    const entry = {
      ...payload,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    items.push(entry);
    await saveItems(this.key, items);
    return entry;
  }

  async update(id, payload) {
    const items = await loadItems(this.key);
    const idx = items.findIndex(n => n.id === id);
    if (idx === -1) throw new Error(`${this.label} not found.`);
    items[idx] = { ...items[idx], ...payload, id };
    await saveItems(this.key, items);
    return items[idx];
  }

  async delete(id) {
    const items = await loadItems(this.key);
    const idx = items.findIndex(n => n.id === id);
    if (idx === -1) throw new Error(`${this.label} not found.`);
    items.splice(idx, 1);
    await saveItems(this.key, items);
    return true;
  }
}

export class DocumentNoteService {
  constructor() {
    this._notes = new NoteService('_document_notes', 'Note');
    this._terms = new NoteService('_document_terms', 'Term');
  }

  async listNotes(params) { return this._notes.list(params); }
  async createNote(payload) { return this._notes.create(payload); }
  async updateNote(id, payload) { return this._notes.update(id, payload); }
  async deleteNote(id) { return this._notes.delete(id); }

  async listTerms(params) { return this._terms.list(params); }
  async createTerm(payload) { return this._terms.create(payload); }
  async updateTerm(id, payload) { return this._terms.update(id, payload); }
  async deleteTerm(id) { return this._terms.delete(id); }
}

export const documentNoteService = new DocumentNoteService();
