import { getSupabaseClient } from '../../../identity/auth/supabaseClient.js';

export class CustomHeaderService {
  async listCustomHeaders(params = {}) {
    const supabase = await getSupabaseClient();
    let query = supabase.from('custom_headers').select('*').order('display_order', { ascending: true });
    if (params.active === 'true') query = query.eq('active', true);
    if (params.visible === 'true') query = query.eq('visible', true);
    if (params.docType) query = query.contains('doc_types', [params.docType]);
    const { data, error } = await query;
    if (error) return { items: [], total: 0 };
    const all = data || [];
    const pageSize = parseInt(params.pageSize, 10) || 200;
    const page = Math.max(1, parseInt(params.page, 10) || 1);
    const total = all.length;
    const paged = all.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total };
  }

  async createCustomHeader(payload) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('custom_headers').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateCustomHeader(id, payload) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('custom_headers').update(payload).eq('id', id).select().single();
    if (error || !data) throw new Error('Custom header not found.');
    return data;
  }

  async deleteCustomHeader(id) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('custom_headers').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
}

export const customHeaderService = new CustomHeaderService();
