import { getSupabaseClient } from '../../../identity/auth/supabaseClient.js';

export class BankService {
  async listBanks() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('banks').select('*').order('created_at', { ascending: false });
    return error ? [] : (data || []);
  }

  async createBank(payload) {
    const supabase = await getSupabaseClient();
    if (payload.is_default) {
      await supabase.from('banks').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    }
    const { data, error } = await supabase.from('banks').insert({ ...payload, id: crypto.randomUUID() }).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateBank(id, payload) {
    const supabase = await getSupabaseClient();
    if (payload.is_default) {
      await supabase.from('banks').update({ is_default: false }).neq('id', id);
    }
    const { data, error } = await supabase.from('banks').update(payload).eq('id', id).select().single();
    if (error || !data) throw new Error('Bank not found.');
    return data;
  }

  async deleteBank(id) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('banks').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
}

export const bankService = new BankService();
