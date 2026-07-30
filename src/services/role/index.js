import { getSupabaseClient } from '../../identity/auth/supabaseClient.js';

export class RoleService {
  async listRoles() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('roles').select('*');
    return error ? [] : (data || []);
  }

  async getRole(id) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('roles').select('*').eq('id', id).single();
    if (error || !data) throw new Error('Role not found.');
    return data;
  }

  async createRole(payload) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('roles').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateRole(id, payload) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('roles').update(payload).eq('id', id).select().single();
    if (error || !data) throw new Error('Role not found.');
    return data;
  }

  async deleteRole(id) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('roles').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
}

export const roleService = new RoleService();
