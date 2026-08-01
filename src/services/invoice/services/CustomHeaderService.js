import { getSupabaseClient } from '../../../identity/auth/supabaseClient.js';

const TABLE = 'custom_headers';

function toRow(payload) {
  const row = {
    display_name: payload.displayName,
    internal_key: payload.internalKey,
    input_type: payload.inputType ?? 'text',
    options: payload.options ?? null,
    active: payload.active ?? true,
    visible: payload.visible ?? true,
    is_default: payload.isDefault ?? false,
    display_order: payload.displayOrder ?? 1,
    column_position: payload.columnPosition ?? 1,
  };
  if (payload.docTypes !== undefined) row.doc_types = payload.docTypes;
  return row;
}

function toApi(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    internalKey: row.internal_key,
    inputType: row.input_type,
    options: row.options,
    active: row.active,
    visible: row.visible,
    isDefault: row.is_default,
    displayOrder: row.display_order,
    columnPosition: row.column_position,
    docTypes: row.doc_types || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function filterPage(items, params) {
  if (params.active === 'true') items = items.filter(h => h.active !== false);
  if (params.inputType) items = items.filter(h => h.inputType === params.inputType);
  if (params.docType) items = items.filter(h => !h.docTypes || !h.docTypes.length || h.docTypes.includes(params.docType));
  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter(h => (h.displayName || '').toLowerCase().includes(q) || (h.internalKey || '').toLowerCase().includes(q));
  }
  const sortField = params.sortField || 'displayOrder';
  const sortDir = params.sortDir || 'asc';
  items = [...items].sort((a, b) => {
    const va = a[sortField] ?? 0;
    const vb = b[sortField] ?? 0;
    if (typeof va === 'string') return sortDir === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb);
    return sortDir === 'desc' ? vb - va : va - vb;
  });
  const pageSize = parseInt(params.pageSize, 10) || 200;
  const pageNum = Math.max(1, parseInt(params.page, 10) || 1);
  const total = items.length;
  const paged = items.slice((pageNum - 1) * pageSize, pageNum * pageSize);
  return { items: paged, total };
}

export class CustomHeaderService {
  async listCustomHeaders(params = {}) {
    const supabase = await getSupabaseClient();
    let q = supabase.from(TABLE).select('*');
    if (params.active === 'true') q = q.eq('active', true);
    if (params.visible === 'true') q = q.eq('visible', true);
    if (params.docType) q = q.contains('doc_types', [params.docType]);
    const { data, error } = await q.order('display_order', { ascending: true });
    if (error) return { items: [], total: 0 };
    return filterPage((data || []).map(toApi), params);
  }

  async createCustomHeader(payload) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).insert({ ...toRow(payload), id: crypto.randomUUID() }).select().single();
    if (error) throw new Error(error.message);
    return toApi(data);
  }

  async updateCustomHeader(id, payload) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).update(toRow(payload)).eq('id', id).select().single();
    if (error || !data) throw new Error('Custom header not found.');
    return toApi(data);
  }

  async deleteCustomHeader(id) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
}

export const customHeaderService = new CustomHeaderService();
