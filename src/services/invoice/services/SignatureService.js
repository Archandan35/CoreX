import { getSupabaseClient } from '../../../identity/auth/supabaseClient.js';

export class SignatureService {
  async listSignatures() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('signatures').select('*').order('created_at', { ascending: false });
    return error ? [] : (data || []);
  }

  async createSignature(payload) {
    const supabase = await getSupabaseClient();
    if (payload.is_default) {
      await supabase.from('signatures').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    }
    const { data, error } = await supabase.from('signatures').insert({ ...payload, id: crypto.randomUUID() }).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteSignature(id) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('signatures').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
}

export const signatureService = new SignatureService();
