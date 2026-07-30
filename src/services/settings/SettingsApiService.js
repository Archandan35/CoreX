import { getSupabaseClient } from '../../identity/auth/supabaseClient.js';

export class SettingsApiService {
  async getAll() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from('settings').select('*');
    if (error || !data) return {};
    const settings = {};
    for (const row of data) settings[row.key] = row.value;
    return { settings };
  }

  async update(updates) {
    const supabase = await getSupabaseClient();
    for (const [key, value] of Object.entries(updates)) {
      const { error } = await supabase.from('settings').upsert(
        { key, value: typeof value === 'string' ? value : JSON.stringify(value) },
        { onConflict: 'key' }
      );
      if (error) throw new Error(error.message);
    }
    return true;
  }
}

export const settingsApiService = new SettingsApiService();
