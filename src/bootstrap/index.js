import { initDatabase } from '../data/index.js';
import { config } from '../config/index.js';
import { healthService } from '../services/health/HealthService.js';
import { cacheService } from '../services/cache/CacheService.js';
import { setApiToken } from '../services/api.js';

export async function bootstrap() {
  const db = await initDatabase(config.databaseProvider, {
    url: config.supabaseUrl,
    anonKey: config.supabaseAnonKey,
  });

  if (db.isSupabase) {
    const { supabase } = db;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      setApiToken(session.access_token);
    }
  }

  healthService.register('database', async () => {
    try {
      await db.query('SELECT 1');
      return true;
    } catch { return false; }
  });

  healthService.register('cache', async () => {
    await cacheService.set('health', 'ok', 1000);
    const val = await cacheService.get('health');
    return val === 'ok';
  });

  return { db };
}

export async function initializeApp() {
  try {
    const result = await bootstrap();
    return { success: true, ...result };
  } catch (error) {
    console.error('Failed to initialize application:', error);
    return { success: false, error };
  }
}
