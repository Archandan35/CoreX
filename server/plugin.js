import { loadEnv } from 'vite';

let db = null;

async function ensureDb(mode) {
  if (db) return db;
  const viteEnv = loadEnv(mode, process.cwd(), 'VITE_');
  const serverEnv = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, viteEnv, serverEnv);

  if (viteEnv.VITE_SUPABASE_URL && viteEnv.VITE_SUPABASE_ANON_KEY) {
    const { initDatabase } = await import('../src/data/index.js');
    db = await initDatabase(viteEnv.VITE_DATABASE_PROVIDER || 'supabase', {
      url: viteEnv.VITE_SUPABASE_URL,
      anonKey: viteEnv.VITE_SUPABASE_ANON_KEY,
    });
  } else {
    const memoryStore = new Map();
    db = {
      isSupabase: false,
      supabase: null,
      settings: {
        getAll: async () => {
          const all = {};
          for (const [k, v] of memoryStore) all[k] = v;
          return all;
        },
        update: async (updates) => {
          for (const [k, v] of Object.entries(updates)) memoryStore.set(k, v);
        },
      },
    };
  }
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
