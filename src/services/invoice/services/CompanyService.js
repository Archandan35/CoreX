import { getSupabaseClient } from '../../../identity/auth/supabaseClient.js';

export class CompanyService {
  async listCompanies() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    return error ? [] : (data || []);
  }

  async getCurrentCompany() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('companies').select('*').maybeSingle();
    return error || !data ? null : data;
  }
}

export const companyService = new CompanyService();
