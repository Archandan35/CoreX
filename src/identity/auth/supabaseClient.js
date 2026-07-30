import { config } from '../../config/index.js';

let client = null;
let clientPromise = null;

function getStored(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export async function getSupabaseClient() {
  if (client) return client;
  if (clientPromise) return clientPromise;

  const supabaseUrl = config.supabaseUrl || getStored('supabase_url');
  const supabaseAnonKey = config.supabaseAnonKey || getStored('supabase_anon_key');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  clientPromise = (async () => {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(supabaseUrl, supabaseAnonKey);
    return client;
  })();
  return clientPromise;
}
