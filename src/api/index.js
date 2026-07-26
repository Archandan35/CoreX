import { authenticate } from './middleware/authenticate.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import roleRoutes from './routes/roles.js';
import settingsRoutes from './routes/settings.js';

export function createRouter(db) {
  const router = {
    stack: [],
    use(fn) {
      this.stack.push(fn);
    },
    get(path, ...handlers) {
      this.stack.push({ method: 'GET', path, handlers });
    },
    post(path, ...handlers) {
      this.stack.push({ method: 'POST', path, handlers });
    },
    put(path, ...handlers) {
      this.stack.push({ method: 'PUT', path, handlers });
    },
    delete(path, ...handlers) {
      this.stack.push({ method: 'DELETE', path, handlers });
    },
  };

  router.use(authenticate);
  router.use((req, res, next) => { req.db = db; next(); });

  authRoutes(router);
  userRoutes(router);
  roleRoutes(router);
  settingsRoutes(router);

  return router;
}

export async function handleRequest(router, req, res) {
  const method = req.method.toUpperCase();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  for (const entry of router.stack) {
    if (entry.method && entry.method !== method) continue;

    if (entry.path) {
      const params = matchRoute(path, entry.path);
      if (!params) continue;
      req.params = params;
    }

    let idx = 0;
    const next = () => { idx++; run(); };
    const run = () => {
      if (idx < entry.handlers.length) {
        entry.handlers[idx](req, res, next);
      }
    };
    run();
    if (res.writableEnded) return;
  }

  if (!res.writableEnded) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found.' }));
  }
}

function matchRoute(requestPath, routePath) {
  const requestParts = requestPath.split('/').filter(Boolean);
  const routeParts = routePath.split('/').filter(Boolean);

  if (requestParts.length !== routeParts.length) return null;

  const params = {};
  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(':')) {
      params[routeParts[i].slice(1)] = requestParts[i];
    } else if (routeParts[i] !== requestParts[i]) {
      return null;
    }
  }

  return params;
}
