import { loadEnv } from 'vite';
import { initDatabase } from '../src/data/index.js';

let db = null;

async function ensureDb(mode) {
  if (db) return db;
  // Load BOTH VITE_-prefixed vars (public, safe for the client bundle) AND
  // non-prefixed server-only secrets (e.g. SUPABASE_SERVICE_ROLE_KEY) into
  // process.env. The secret lives only in process.env on the server and is
  // read via src/config/serverSecrets.js — it is never referenced through
  // import.meta.env, so Vite never inlines it into the client bundle.
  const viteEnv = loadEnv(mode, process.cwd(), 'VITE_');
  const serverEnv = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, viteEnv, serverEnv);
  db = await initDatabase(viteEnv.VITE_DATABASE_PROVIDER || 'supabase', {
    url: viteEnv.VITE_SUPABASE_URL,
    anonKey: viteEnv.VITE_SUPABASE_ANON_KEY,
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
