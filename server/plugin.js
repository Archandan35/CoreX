import { loadEnv } from 'vite';
import { initDatabase } from '../src/data/index.js';

let db = null;

async function ensureDb(mode) {
  if (db) return db;
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  Object.assign(process.env, env);
  db = await initDatabase(env.VITE_DATABASE_PROVIDER || 'supabase', {
    url: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY,
  });
  return db;
}

export default function apiPlugin() {
  return {
    name: 'corex-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith('/api/')) {
          const dbase = await ensureDb(server.config.mode);
          const { handleApiRequest } = await import('./api.js');
          handleApiRequest(req, res, dbase);
        } else {
          next();
        }
      });
    },
  };
}
