import { config } from '../../config/index.js';

let client = null;
let clientPromise = null;

export async function getSupabaseClient() {
  if (client) return client;
  if (clientPromise) return clientPromise;
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  clientPromise = (async () => {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(config.supabaseUrl, config.supabaseAnonKey);
    return client;
  })();
  return clientPromise;
}
