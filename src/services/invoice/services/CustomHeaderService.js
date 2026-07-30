import { getSupabaseClient } from '../../../identity/auth/supabaseClient.js';

const SETTINGS_KEY = '_custom_headers';

async function loadItems() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
  if (error || !data) return [];
  try { return JSON.parse(data.value); } catch { return []; }
}

async function saveItems(items) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('settings').upsert(
    { key: SETTINGS_KEY, value: JSON.stringify(items) },
    { onConflict: 'key' }
  );
  if (error) throw new Error(error.message);
}

function filterPage(items, params) {
  if (params.active === 'true') items = items.filter(h => h.active !== false);
  if (params.inputType) items = items.filter(h => h.inputType === params.inputType);
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
    const items = await loadItems();
    return filterPage(items, params);
  }

  async createCustomHeader(payload) {
    const items = await loadItems();
    const header = {
      ...payload,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    items.push(header);
    await saveItems(items);
    return header;
  }

  async updateCustomHeader(id, payload) {
    const items = await loadItems();
    const idx = items.findIndex(h => h.id === id);
    if (idx === -1) throw new Error('Custom header not found.');
    items[idx] = { ...items[idx], ...payload, id };
    await saveItems(items);
    return items[idx];
  }

  async deleteCustomHeader(id) {
    const items = await loadItems();
    const idx = items.findIndex(h => h.id === id);
    if (idx === -1) throw new Error('Custom header not found.');
    items.splice(idx, 1);
    await saveItems(items);
    return true;
  }
}

export const customHeaderService = new CustomHeaderService();
