import { getSupabaseClient } from '../../../identity/auth/supabaseClient.js';

const SETTINGS_KEY = '_prefix_settings';

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

export class PrefixService {
  async listPrefixes(params = {}) {
    const items = await loadItems();
    return filterPage(items, params);
  }

  async createPrefix(payload) {
    const items = await loadItems();
    const prefix = {
      ...payload,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    if (prefix.isDefault) items.forEach(p => { p.isDefault = false; });
    items.push(prefix);
    await saveItems(items);
    return prefix;
  }

  async updatePrefix(id, payload) {
    const items = await loadItems();
    const idx = items.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Prefix not found.');
    if (payload.isDefault) items.forEach(p => { p.isDefault = false; });
    items[idx] = { ...items[idx], ...payload, id };
    await saveItems(items);
    return items[idx];
  }

  async deletePrefix(id) {
    const items = await loadItems();
    const idx = items.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Prefix not found.');
    items.splice(idx, 1);
    await saveItems(items);
    return true;
  }

  async setDefaultPrefix(id) {
    const items = await loadItems();
    const idx = items.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Prefix not found.');
    items.forEach(p => { p.isDefault = false; });
    items[idx].isDefault = true;
    await saveItems(items);
    return items[idx];
  }
}

export const prefixService = new PrefixService();
