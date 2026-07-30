import { getSupabaseClient } from '../../../identity/auth/supabaseClient.js';

export class CustomerService {
  async listCustomers(query) {
    const supabase = await getSupabaseClient();
    let q = supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (query) q = q.or(`name.ilike.%${query}%,company.ilike.%${query}%,email.ilike.%${query}%`);
    const { data, error } = await q;
    return error ? [] : (data || []);
  }

  async createCustomer(payload) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('customers').insert({ ...payload, id: crypto.randomUUID() }).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateCustomer(id, payload) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('customers').update(payload).eq('id', id).select().single();
    if (error || !data) throw new Error('Customer not found.');
    return data;
  }

  async getCustomerOutstanding(id) {
    if (!id) return { totalOutstanding: 0, overdueAmount: 0 };
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.from('customers').select('outstanding_balance').eq('id', id).single();
      if (error || !data) return { totalOutstanding: 0, overdueAmount: 0 };
      return { totalOutstanding: data.outstanding_balance || 0, overdueAmount: 0 };
    } catch {
      return { totalOutstanding: 0, overdueAmount: 0 };
    }
  }
}

export const customerService = new CustomerService();
