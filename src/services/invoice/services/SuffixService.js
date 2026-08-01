import { getSupabaseClient } from '../../../identity/auth/supabaseClient.js';

const TABLE = 'document_suffixes';

function toRow(payload) {
  return {
    value: payload.value,
    description: payload.description ?? null,
    doc_type: payload.docType,
    is_active: payload.isActive ?? true,
    is_default: payload.isDefault ?? false,
    sequence_order: payload.sequenceOrder ?? 1,
  };
}

function toApi(row) {
  return {
    id: row.id,
    value: row.value,
    description: row.description,
    docType: row.doc_type,
    isActive: row.is_active,
    isDefault: row.is_default,
    sequenceOrder: row.sequence_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function filterPage(items, params) {
  if (params.active === 'true') items = items.filter(p => p.isActive !== false);
  if (params.default === 'true') items = items.filter(p => p.isDefault === true);
  if (params.docType) items = items.filter(p => p.docType === params.docType);
  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter(p => (p.value || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  }
  const sortField = params.sortField || 'sequenceOrder';
  const sortDir = params.sortDir || 'asc';
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

export class SuffixService {
  async listSuffixes(params = {}) {
    const supabase = await getSupabaseClient();
    let q = supabase.from(TABLE).select('*');
    if (params.docType) q = q.eq('doc_type', params.docType);
    const { data, error } = await q.order('sequence_order', { ascending: true });
    if (error) return { items: [], total: 0 };
    return filterPage((data || []).map(toApi), params);
  }

  async createSuffix(payload) {
    const supabase = await getSupabaseClient();
    const row = { ...toRow(payload), id: crypto.randomUUID() };
    if (row.is_default) {
      await supabase.from(TABLE).update({ is_default: false }).eq('doc_type', row.doc_type).neq('id', row.id);
    }
    const { data, error } = await supabase.from(TABLE).insert(row).select().single();
    if (error) throw new Error(error.message);
    return toApi(data);
  }

  async updateSuffix(id, payload) {
    const supabase = await getSupabaseClient();
    const updates = toRow(payload);
    if (updates.is_default) {
      await supabase.from(TABLE).update({ is_default: false }).eq('doc_type', updates.doc_type).neq('id', id);
    }
    const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
    if (error || !data) throw new Error('Suffix not found.');
    return toApi(data);
  }

  async deleteSuffix(id) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  async setDefaultSuffix(id) {
    const supabase = await getSupabaseClient();
    const { data: current } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (!current) throw new Error('Suffix not found.');
    await supabase.from(TABLE).update({ is_default: false }).eq('doc_type', current.doc_type);
    const { data, error } = await supabase.from(TABLE).update({ is_default: true }).eq('id', id).select().single();
    if (error || !data) throw new Error('Suffix not found.');
    return toApi(data);
  }
}

export const suffixService = new SuffixService();
