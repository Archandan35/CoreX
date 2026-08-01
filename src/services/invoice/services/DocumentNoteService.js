import { getSupabaseClient } from '../../../identity/auth/supabaseClient.js';

function toRow(payload) {
  const row = {
    doc_type: payload.docType ?? null,
    title: payload.title ?? null,
  };
  if (payload.text !== undefined) row.content = payload.text;
  else if (payload.content !== undefined) row.content = payload.content;
  return row;
}

function toApi(row) {
  return {
    id: row.id,
    docType: row.doc_type,
    title: row.title,
    content: row.content,
    text: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function filterPage(items, params) {
  if (params.docType) items = items.filter(n => n.docType === params.docType);
  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter(n => (n.content || '').toLowerCase().includes(q) || (n.title || '').toLowerCase().includes(q));
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
  constructor(table, label) {
    this.table = table;
    this.label = label;
  }

  async list(params = {}) {
    const supabase = await getSupabaseClient();
    let q = supabase.from(this.table).select('*');
    if (params.docType) q = q.eq('doc_type', params.docType);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) return { items: [], total: 0 };
    return filterPage((data || []).map(toApi), params);
  }

  async create(payload) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from(this.table).insert({ ...toRow(payload), id: crypto.randomUUID() }).select().single();
    if (error) throw new Error(error.message);
    return toApi(data);
  }

  async update(id, payload) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from(this.table).update(toRow(payload)).eq('id', id).select().single();
    if (error || !data) throw new Error(`${this.label} not found.`);
    return toApi(data);
  }

  async delete(id) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
}

export class DocumentNoteService {
  constructor() {
    this._notes = new NoteService('document_notes', 'Note');
    this._terms = new NoteService('document_terms', 'Term');
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
