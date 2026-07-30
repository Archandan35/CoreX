import { getSupabaseClient } from '../../identity/auth/supabaseClient.js';

export class UserService {
  async listUsers() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('users').select('*');
    return error ? [] : (data || []);
  }

  async getUser(id) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error || !data) throw new Error('User not found.');
    return data;
  }

  async createUser(payload) {
    const supabase = await getSupabaseClient();
    const { password, ...profile } = payload;
    const { data, error } = await supabase.from('users').insert({ ...profile, id: crypto.randomUUID() }).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateUser(id, payload) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('users').update(payload).eq('id', id).select().single();
    if (error || !data) throw new Error('User not found.');
    return data;
  }

  async deleteUser(id) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
}

export const userService = new UserService();
