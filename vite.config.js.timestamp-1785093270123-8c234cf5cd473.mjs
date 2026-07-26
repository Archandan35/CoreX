var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/config/index.js
var config_exports = {};
__export(config_exports, {
  config: () => config,
  isSupabaseEnabled: () => isSupabaseEnabled
});
function isSupabaseEnabled() {
  return !!(config.supabaseUrl && config.supabaseAnonKey);
}
var config;
var init_config = __esm({
  "src/config/index.js"() {
    config = Object.freeze({
      get authProvider() {
        return typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_AUTH_PROVIDER : typeof process !== "undefined" && process.env ? process.env.VITE_AUTH_PROVIDER : void 0;
      },
      get databaseProvider() {
        return typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_DATABASE_PROVIDER : typeof process !== "undefined" && process.env ? process.env.VITE_DATABASE_PROVIDER : void 0;
      },
      get storageProvider() {
        return typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_STORAGE_PROVIDER : typeof process !== "undefined" && process.env ? process.env.VITE_STORAGE_PROVIDER : void 0;
      },
      get storageRootFolder() {
        return typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_STORAGE_ROOT_FOLDER : typeof process !== "undefined" && process.env ? process.env.VITE_STORAGE_ROOT_FOLDER : void 0;
      },
      get supabaseUrl() {
        return typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : typeof process !== "undefined" && process.env ? process.env.VITE_SUPABASE_URL : void 0;
      },
      get supabaseAnonKey() {
        return typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : typeof process !== "undefined" && process.env ? process.env.VITE_SUPABASE_ANON_KEY : void 0;
      },
      // SECURITY: The Supabase service role key is a FULL-ADMIN secret that
      // bypasses Row Level Security and must NEVER be exposed to the browser.
      // There is intentionally NO `supabaseServiceRoleKey` getter on this
      // client-facing config object. Previously this getter read
      // `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY`, which caused Vite to
      // inline the value into the client bundle whenever it was set — leaking a
      // full-admin credential to every visitor. The service role key is now only
      // ever read from `process.env` on the server (see
      // `src/config/serverSecrets.js`). Do not re-add a getter here that
      // references `import.meta.env` for this key.
      get supabaseBucket() {
        return typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_SUPABASE_BUCKET : typeof process !== "undefined" && process.env ? process.env.VITE_SUPABASE_BUCKET : void 0;
      },
      get appUrl() {
        const envUrl = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_APP_URL : typeof process !== "undefined" && process.env ? process.env.VITE_APP_URL : void 0;
        const hasWindow = typeof window !== "undefined" && window.location && window.location.origin;
        const actualOrigin = hasWindow ? window.location.origin : null;
        if (actualOrigin) {
          const normalizedEnv = envUrl ? String(envUrl).replace(/\/$/, "") : null;
          const envIsConsistent = !!normalizedEnv && actualOrigin.startsWith(normalizedEnv);
          const envIsLocalhost = !!normalizedEnv && /^https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(normalizedEnv);
          const actualIsLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(actualOrigin);
          if (envIsConsistent) return normalizedEnv;
          if (!envIsLocalhost || actualIsLocalhost) return actualOrigin;
          return actualOrigin;
        }
        return envUrl || "http://localhost:3000";
      }
    });
  }
});

// src/config/serverSecrets.js
var serverSecrets_exports = {};
__export(serverSecrets_exports, {
  getSupabaseServiceRoleKey: () => getSupabaseServiceRoleKey
});
function getSupabaseServiceRoleKey() {
  if (typeof process === "undefined") return void 0;
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || void 0;
}
var init_serverSecrets = __esm({
  "src/config/serverSecrets.js"() {
  }
});

// server/api.js
var api_exports = {};
__export(api_exports, {
  handleApiRequest: () => handleApiRequest
});
async function handleApiRequest(req, res, db2) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method.toUpperCase();
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", async () => {
    let parsed;
    try {
      parsed = body ? JSON.parse(body) : {};
    } catch {
      parsed = {};
    }
    const send = (status, data) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };
    const token = req.headers.authorization?.replace("Bearer ", "") || "";
    let currentUser = null;
    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          currentUser = JSON.parse(Buffer.from(parts[1], "base64").toString());
        }
      } catch {
      }
    }
    function checkPermission(perm) {
      if (!currentUser) return send(401, { error: "Authentication required." });
      if (!currentUser.permissions?.includes(perm) && !currentUser.permissions?.includes("*")) {
        send(403, { error: "Forbidden." });
        return false;
      }
      return true;
    }
    try {
      if (db2.isSupabase) {
        await handleSupabase(db2.supabase, path, method, parsed, send, currentUser, token);
      } else {
        await handleMemory(db2, path, method, parsed, send, currentUser);
      }
    } catch (err) {
      send(500, { error: "Internal server error." });
    }
  });
}
async function handleMemory(db2, path, method, parsed, send, currentUser) {
  function checkPermission(perm) {
    if (!currentUser) {
      send(401, { error: "Authentication required." });
      return false;
    }
    if (!currentUser.permissions?.includes(perm) && !currentUser.permissions?.includes("*")) {
      send(403, { error: "Forbidden." });
      return false;
    }
    return true;
  }
  if (path === "/api/auth/login" && method === "POST") {
    const user = await db2.users.findByEmail(parsed.identifier);
    if (!user) return send(401, { error: "Invalid credentials." });
    const { password_hash, ...safe } = user;
    const payload = { id: user.id, role: user.role, permissions: user.permissions || [] };
    const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64");
    const bodyB64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    return send(200, { user: safe, token: `${header}.${bodyB64}.sig` });
  }
  if (path === "/api/auth/register" && method === "POST") {
    const existing = await db2.users.findByEmail(parsed.email);
    if (existing) return send(409, { error: "Email already registered." });
    const user = await db2.users.create({
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone || "",
      password_hash: parsed.password,
      role: parsed.role || "user",
      permissions: [],
      status: "active"
    });
    if (!user) return send(500, { error: "Registration failed." });
    const { password_hash, ...safe } = user;
    const payload = { id: user.id, role: user.role, permissions: user.permissions || [] };
    const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64");
    const bodyB64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    return send(201, { user: safe, token: `${header}.${bodyB64}.sig`, notice: "Account created successfully." });
  }
  if (path === "/api/auth/logout" && method === "POST") return send(200, { ok: true });
  if (path === "/api/auth/me" && method === "GET") {
    if (!currentUser) return send(401, { error: "Not authenticated." });
    return send(200, { user: currentUser });
  }
  if (method === "GET" && path === "/api/roles") {
    if (!checkPermission("role:read")) return;
    const roles = await db2.roles.findAll(currentUser);
    return send(200, { roles });
  }
  if (method === "GET" && path.match(/^\/api\/roles\/(.+)$/)) {
    if (!checkPermission("role:read")) return;
    const id = path.match(/^\/api\/roles\/(.+)$/)[1];
    const role = await db2.roles.findById(id, currentUser);
    if (!role) return send(404, { error: "Role not found." });
    return send(200, { role });
  }
  if (method === "POST" && path === "/api/roles") {
    if (!checkPermission("role:create")) return;
    const role = await db2.roles.create(parsed, currentUser);
    if (!role) return send(500, { error: "Failed to create role." });
    return send(201, { role });
  }
  if (method === "PUT" && path.match(/^\/api\/roles\/(.+)$/)) {
    if (!checkPermission("role:update")) return;
    const id = path.match(/^\/api\/roles\/(.+)$/)[1];
    const role = await db2.roles.update(id, parsed, currentUser);
    if (!role) return send(404, { error: "Role not found." });
    return send(200, { role });
  }
  if (method === "DELETE" && path.match(/^\/api\/roles\/(.+)$/)) {
    if (!checkPermission("role:delete")) return;
    const id = path.match(/^\/api\/roles\/(.+)$/)[1];
    const ok = await db2.roles.delete(id, currentUser);
    if (!ok) return send(404, { error: "Role not found." });
    return send(200, { ok: true });
  }
  if (method === "GET" && path === "/api/users") {
    if (!checkPermission("user:read")) return;
    const users = await db2.users.findAll(currentUser);
    const safe = users.map((u) => {
      const { password_hash, ...rest } = u;
      return rest;
    });
    return send(200, { users: safe });
  }
  if (method === "GET" && path.match(/^\/api\/users\/(.+)$/)) {
    if (!checkPermission("user:read")) return;
    const id = path.match(/^\/api\/users\/(.+)$/)[1];
    const user = await db2.users.findById(id, currentUser);
    if (!user) return send(404, { error: "User not found." });
    const { password_hash, ...safe } = user;
    return send(200, { user: safe });
  }
  if (method === "POST" && path === "/api/users") {
    if (!checkPermission("user:create")) return;
    const existing = await db2.users.findByEmail(parsed.email);
    if (existing) return send(409, { error: "Email already in use." });
    const user = await db2.users.create(parsed, currentUser);
    if (!user) return send(500, { error: "Failed to create user." });
    const { password_hash, ...safe } = user;
    return send(201, { user: safe });
  }
  if (method === "PUT" && path.match(/^\/api\/users\/(.+)$/)) {
    if (!checkPermission("user:update")) return;
    const id = path.match(/^\/api\/users\/(.+)$/)[1];
    const user = await db2.users.update(id, parsed, currentUser);
    if (!user) return send(404, { error: "User not found." });
    const { password_hash, ...safe } = user;
    return send(200, { user: safe });
  }
  if (method === "DELETE" && path.match(/^\/api\/users\/(.+)$/)) {
    if (!checkPermission("user:delete")) return;
    const id = path.match(/^\/api\/users\/(.+)$/)[1];
    const ok = await db2.users.delete(id, currentUser);
    if (!ok) return send(404, { error: "User not found." });
    return send(200, { ok: true });
  }
  if (method === "GET" && path === "/api/settings") {
    if (!checkPermission("settings:read")) return;
    const settings = await db2.settings.getAll();
    return send(200, { settings });
  }
  if (method === "PUT" && path === "/api/settings") {
    if (!checkPermission("settings:update")) return;
    await db2.settings.update(parsed);
    return send(200, { ok: true });
  }
  return send(404, { error: "Not found." });
}
async function handleSupabase(supabase, path, method, parsed, send, currentUser) {
  function cp(perm) {
    if (!currentUser) {
      send(401, { error: "Authentication required." });
      return false;
    }
    if (!currentUser.permissions?.includes(perm) && !currentUser.permissions?.includes("*")) {
      send(403, { error: "Forbidden." });
      return false;
    }
    return true;
  }
  if (path === "/api/auth/login" && method === "POST") {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.identifier,
      password: parsed.password
    });
    if (error) return send(401, { error: error.message });
    return send(200, {
      user: { id: data.user.id, email: data.user.email, role: data.user.user_metadata?.role || "user", permissions: data.user.user_metadata?.permissions || [] },
      token: data.session.access_token
    });
  }
  if (path === "/api/auth/register" && method === "POST") {
    const { data, error } = await supabase.auth.signUp({
      email: parsed.email,
      password: parsed.password,
      options: { data: { name: parsed.name, phone: parsed.phone, role: parsed.role || "user", permissions: [] } }
    });
    if (error) return send(400, { error: error.message });
    return send(201, {
      user: { id: data.user.id, email: parsed.email, role: parsed.role || "user", permissions: [] },
      token: data.session?.access_token || "",
      notice: "Account created."
    });
  }
  if (path === "/api/auth/logout" && method === "POST") {
    await supabase.auth.signOut();
    return send(200, { ok: true });
  }
  if (path === "/api/auth/me" && method === "GET") {
    const { data } = await supabase.auth.getUser(currentUser?.id ? currentUser.id : void 0);
    if (!data?.user) return send(401, { error: "Not authenticated." });
    return send(200, { user: { id: data.user.id, email: data.user.email, role: data.user.user_metadata?.role || "user", permissions: data.user.user_metadata?.permissions || [] } });
  }
  const adminClient = await adminSupabase();
  if (method === "GET" && path === "/api/roles") {
    if (!cp("role:read")) return;
    const { data, error } = await adminClient.from("roles").select("*");
    if (error) return send(500, { error: error.message });
    return send(200, { roles: data || [] });
  }
  if (method === "GET" && path.match(/^\/api\/roles\/(.+)$/)) {
    if (!cp("role:read")) return;
    const id = path.match(/^\/api\/roles\/(.+)$/)[1];
    const { data, error } = await adminClient.from("roles").select("*").eq("id", id).single();
    if (error || !data) return send(404, { error: "Role not found." });
    return send(200, { role: data });
  }
  if (method === "POST" && path === "/api/roles") {
    if (!cp("role:create")) return;
    const { data, error } = await adminClient.from("roles").insert(parsed).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { role: data });
  }
  if (method === "PUT" && path.match(/^\/api\/roles\/(.+)$/)) {
    if (!cp("role:update")) return;
    const id = path.match(/^\/api\/roles\/(.+)$/)[1];
    const { data, error } = await adminClient.from("roles").update(parsed).eq("id", id).select().single();
    if (error || !data) return send(404, { error: "Role not found." });
    return send(200, { role: data });
  }
  if (method === "DELETE" && path.match(/^\/api\/roles\/(.+)$/)) {
    if (!cp("role:delete")) return;
    const id = path.match(/^\/api\/roles\/(.+)$/)[1];
    const { error } = await adminClient.from("roles").delete().eq("id", id);
    if (error) return send(500, { error: error.message });
    return send(200, { ok: true });
  }
  if (method === "GET" && path === "/api/users") {
    if (!cp("user:read")) return;
    const { data, error } = await adminClient.from("users").select("*");
    if (error) return send(500, { error: error.message });
    return send(200, { users: data || [] });
  }
  if (method === "GET" && path.match(/^\/api\/users\/(.+)$/)) {
    if (!cp("user:read")) return;
    const id = path.match(/^\/api\/users\/(.+)$/)[1];
    const { data, error } = await adminClient.from("users").select("*").eq("id", id).single();
    if (error || !data) return send(404, { error: "User not found." });
    return send(200, { user: data });
  }
  if (method === "POST" && path === "/api/users") {
    if (!cp("user:create")) return;
    const { data, error } = await adminClient.from("users").insert(parsed).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { user: data });
  }
  if (method === "PUT" && path.match(/^\/api\/users\/(.+)$/)) {
    if (!cp("user:update")) return;
    const id = path.match(/^\/api\/users\/(.+)$/)[1];
    const { data, error } = await adminClient.from("users").update(parsed).eq("id", id).select().single();
    if (error || !data) return send(404, { error: "User not found." });
    return send(200, { user: data });
  }
  if (method === "DELETE" && path.match(/^\/api\/users\/(.+)$/)) {
    if (!cp("user:delete")) return;
    const id = path.match(/^\/api\/users\/(.+)$/)[1];
    const { error } = await adminClient.from("users").delete().eq("id", id);
    if (error) return send(500, { error: error.message });
    return send(200, { ok: true });
  }
  if (method === "GET" && path === "/api/settings") {
    if (!cp("settings:read")) return;
    const { data, error } = await adminClient.from("settings").select("*");
    if (error) return send(500, { error: error.message });
    const settings = {};
    (data || []).forEach((row) => {
      settings[row.key] = row.value;
    });
    return send(200, { settings });
  }
  if (method === "PUT" && path === "/api/settings") {
    if (!cp("settings:update")) return;
    for (const [key, value] of Object.entries(parsed)) {
      await adminClient.from("settings").upsert({ key, value }, { onConflict: "key" });
    }
    return send(200, { ok: true });
  }
  return send(404, { error: "Not found." });
}
async function adminSupabase() {
  if (_adminSupabase) return _adminSupabase;
  const { createClient } = await import("file:///H:/code/Smart/CoreX/node_modules/@supabase/supabase-js/dist/index.mjs");
  const { config: config2 } = await Promise.resolve().then(() => (init_config(), config_exports));
  const { getSupabaseServiceRoleKey: getSupabaseServiceRoleKey2 } = await Promise.resolve().then(() => (init_serverSecrets(), serverSecrets_exports));
  const serviceRoleKey = getSupabaseServiceRoleKey2();
  if (!serviceRoleKey) {
    throw new Error("Supabase service role key is not configured on the server (process.env.SUPABASE_SERVICE_ROLE_KEY). Administrative API operations require it.");
  }
  _adminSupabase = createClient(config2.supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return _adminSupabase;
}
var _adminSupabase;
var init_api = __esm({
  "server/api.js"() {
    _adminSupabase = null;
  }
});

// vite.config.js
import { defineConfig } from "file:///H:/code/Smart/CoreX/node_modules/vite/dist/node/index.js";
import react from "file:///H:/code/Smart/CoreX/node_modules/@vitejs/plugin-react/dist/index.js";

// server/plugin.js
import { loadEnv } from "file:///H:/code/Smart/CoreX/node_modules/vite/dist/node/index.js";

// src/data/index.js
init_config();

// src/data/providers/index.js
var DatabaseProvider = class {
  constructor() {
    this.connection = null;
    this.type = null;
  }
  async connect(config2) {
    throw new Error("connect() must be implemented by provider subclass.");
  }
  async query(sql, params) {
    throw new Error("query() must be implemented by provider subclass.");
  }
  async disconnect() {
    throw new Error("disconnect() must be implemented by provider subclass.");
  }
};

// src/data/sqlParams.js
function sqlLiteral(value) {
  if (value === null || value === void 0) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}
function bindInline(sql, params) {
  if (!params || params.length === 0) return sql;
  let out = "";
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (ch === "$" && /[1-9]/.test(sql[i + 1] || "")) {
      let num = "";
      let j = i + 1;
      while (j < sql.length && /[0-9]/.test(sql[j])) {
        num += sql[j];
        j += 1;
      }
      const pos = parseInt(num, 10) - 1;
      if (pos >= 0 && pos < params.length) {
        out += sqlLiteral(params[pos]);
        i = j - 1;
        continue;
      }
    }
    out += ch;
  }
  return out;
}

// src/data/providers/SupabaseProvider.js
var EXEC_SQL_NOT_INSTALLED_HINT = "The 'exec_sql' helper function is not installed in this database. Run the generated schema SQL (which begins with CREATE FUNCTION exec_sql) in the Supabase SQL Editor, then try again.";
var SupabaseProvider = class extends DatabaseProvider {
  async connect(config2) {
    this.type = "supabase";
    const { createClient } = await import("file:///H:/code/Smart/CoreX/node_modules/@supabase/supabase-js/dist/index.mjs");
    this.client = createClient(config2.url, config2.anonKey);
  }
  async query(sql, params = []) {
    if (!this.client) throw new Error("Supabase not connected. Call connect() first.");
    const queryText = bindInline(sql, params);
    const { data, error } = await this.client.rpc("exec_sql", { query_text: queryText });
    if (error) {
      const code = error.code || "";
      const message = (error.message || "").toLowerCase();
      const notInstalled = code === "PGRST202" || code === "42883" || message.includes("exec_sql") || message.includes("could not find the function");
      if (notInstalled) {
        throw new Error(EXEC_SQL_NOT_INSTALLED_HINT);
      }
      throw new Error(error.message || "Supabase RPC exec_sql failed.");
    }
    return Array.isArray(data) ? data : [];
  }
  getClient() {
    if (!this.client) throw new Error("Supabase not connected. Call connect() first.");
    return this.client;
  }
  table(name) {
    return this.getClient().from(name);
  }
  async disconnect() {
  }
};

// src/data/index.js
var dbInstance = null;
async function initDatabase(providerType, providerConfig) {
  const type = providerType || config.databaseProvider;
  if (type && type !== "supabase") {
    throw new Error(`Unsupported database provider: ${type}. Only 'supabase' is supported.`);
  }
  const cfg = providerConfig || {};
  const provider = new SupabaseProvider();
  await provider.connect({
    url: cfg.url || config.supabaseUrl,
    anonKey: cfg.anonKey || config.supabaseAnonKey
  });
  const db2 = {
    provider,
    users: null,
    roles: null,
    settings: null,
    query: (sql, params) => provider.query(sql, params),
    isSupabase: true,
    supabase: provider.getClient(),
    _databaseName: (cfg.url || config.supabaseUrl)?.match(/https:\/\/([^.]+)/)?.[1] || "Supabase"
  };
  dbInstance = db2;
  return db2;
}

// server/plugin.js
var db = null;
async function ensureDb(mode) {
  if (db) return db;
  const viteEnv = loadEnv(mode, process.cwd(), "VITE_");
  const serverEnv = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, viteEnv, serverEnv);
  db = await initDatabase(viteEnv.VITE_DATABASE_PROVIDER || "supabase", {
    url: viteEnv.VITE_SUPABASE_URL,
    anonKey: viteEnv.VITE_SUPABASE_ANON_KEY
  });
  return db;
}
function apiPlugin() {
  return {
    name: "corex-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith("/api/")) {
          const dbase = await ensureDb(server.config.mode);
          const { handleApiRequest: handleApiRequest2 } = await Promise.resolve().then(() => (init_api(), api_exports));
          handleApiRequest2(req, res, dbase);
        } else {
          next();
        }
      });
    }
  };
}

// vite.config.js
var vite_config_default = defineConfig({
  plugins: [react(), apiPlugin()],
  build: {
    outDir: "dist",
    rollupOptions: {
      external: ["pg", "sqlite3", "sqlite"]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbmZpZy9pbmRleC5qcyIsICJzcmMvY29uZmlnL3NlcnZlclNlY3JldHMuanMiLCAic2VydmVyL2FwaS5qcyIsICJ2aXRlLmNvbmZpZy5qcyIsICJzZXJ2ZXIvcGx1Z2luLmpzIiwgInNyYy9kYXRhL2luZGV4LmpzIiwgInNyYy9kYXRhL3Byb3ZpZGVycy9pbmRleC5qcyIsICJzcmMvZGF0YS9zcWxQYXJhbXMuanMiLCAic3JjL2RhdGEvcHJvdmlkZXJzL1N1cGFiYXNlUHJvdmlkZXIuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJIOlxcXFxjb2RlXFxcXFNtYXJ0XFxcXENvcmVYXFxcXHNyY1xcXFxjb25maWdcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkg6XFxcXGNvZGVcXFxcU21hcnRcXFxcQ29yZVhcXFxcc3JjXFxcXGNvbmZpZ1xcXFxpbmRleC5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vSDovY29kZS9TbWFydC9Db3JlWC9zcmMvY29uZmlnL2luZGV4LmpzXCI7ZXhwb3J0IGNvbnN0IGNvbmZpZyA9IE9iamVjdC5mcmVlemUoe1xuICBnZXQgYXV0aFByb3ZpZGVyKCkge1xuICAgIHJldHVybiB0eXBlb2YgaW1wb3J0Lm1ldGEgIT09ICd1bmRlZmluZWQnICYmIGltcG9ydC5tZXRhLmVudlxuICAgICAgPyBpbXBvcnQubWV0YS5lbnYuVklURV9BVVRIX1BST1ZJREVSXG4gICAgICA6IHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiBwcm9jZXNzLmVudlxuICAgICAgICA/IHByb2Nlc3MuZW52LlZJVEVfQVVUSF9QUk9WSURFUlxuICAgICAgICA6IHVuZGVmaW5lZDtcbiAgfSxcbiAgZ2V0IGRhdGFiYXNlUHJvdmlkZXIoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBpbXBvcnQubWV0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgaW1wb3J0Lm1ldGEuZW52XG4gICAgICA/IGltcG9ydC5tZXRhLmVudi5WSVRFX0RBVEFCQVNFX1BST1ZJREVSXG4gICAgICA6IHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiBwcm9jZXNzLmVudlxuICAgICAgICA/IHByb2Nlc3MuZW52LlZJVEVfREFUQUJBU0VfUFJPVklERVJcbiAgICAgICAgOiB1bmRlZmluZWQ7XG4gIH0sXG4gIGdldCBzdG9yYWdlUHJvdmlkZXIoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBpbXBvcnQubWV0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgaW1wb3J0Lm1ldGEuZW52XG4gICAgICA/IGltcG9ydC5tZXRhLmVudi5WSVRFX1NUT1JBR0VfUFJPVklERVJcbiAgICAgIDogdHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHByb2Nlc3MuZW52XG4gICAgICAgID8gcHJvY2Vzcy5lbnYuVklURV9TVE9SQUdFX1BST1ZJREVSXG4gICAgICAgIDogdW5kZWZpbmVkO1xuICB9LFxuICBnZXQgc3RvcmFnZVJvb3RGb2xkZXIoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBpbXBvcnQubWV0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgaW1wb3J0Lm1ldGEuZW52XG4gICAgICA/IGltcG9ydC5tZXRhLmVudi5WSVRFX1NUT1JBR0VfUk9PVF9GT0xERVJcbiAgICAgIDogdHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHByb2Nlc3MuZW52XG4gICAgICAgID8gcHJvY2Vzcy5lbnYuVklURV9TVE9SQUdFX1JPT1RfRk9MREVSXG4gICAgICAgIDogdW5kZWZpbmVkO1xuICB9LFxuICBnZXQgc3VwYWJhc2VVcmwoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBpbXBvcnQubWV0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgaW1wb3J0Lm1ldGEuZW52XG4gICAgICA/IGltcG9ydC5tZXRhLmVudi5WSVRFX1NVUEFCQVNFX1VSTFxuICAgICAgOiB0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvY2Vzcy5lbnZcbiAgICAgICAgPyBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX1VSTFxuICAgICAgICA6IHVuZGVmaW5lZDtcbiAgfSxcbiAgZ2V0IHN1cGFiYXNlQW5vbktleSgpIHtcbiAgICByZXR1cm4gdHlwZW9mIGltcG9ydC5tZXRhICE9PSAndW5kZWZpbmVkJyAmJiBpbXBvcnQubWV0YS5lbnZcbiAgICAgID8gaW1wb3J0Lm1ldGEuZW52LlZJVEVfU1VQQUJBU0VfQU5PTl9LRVlcbiAgICAgIDogdHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHByb2Nlc3MuZW52XG4gICAgICAgID8gcHJvY2Vzcy5lbnYuVklURV9TVVBBQkFTRV9BTk9OX0tFWVxuICAgICAgICA6IHVuZGVmaW5lZDtcbiAgfSxcbiAgLy8gU0VDVVJJVFk6IFRoZSBTdXBhYmFzZSBzZXJ2aWNlIHJvbGUga2V5IGlzIGEgRlVMTC1BRE1JTiBzZWNyZXQgdGhhdFxuICAvLyBieXBhc3NlcyBSb3cgTGV2ZWwgU2VjdXJpdHkgYW5kIG11c3QgTkVWRVIgYmUgZXhwb3NlZCB0byB0aGUgYnJvd3Nlci5cbiAgLy8gVGhlcmUgaXMgaW50ZW50aW9uYWxseSBOTyBgc3VwYWJhc2VTZXJ2aWNlUm9sZUtleWAgZ2V0dGVyIG9uIHRoaXNcbiAgLy8gY2xpZW50LWZhY2luZyBjb25maWcgb2JqZWN0LiBQcmV2aW91c2x5IHRoaXMgZ2V0dGVyIHJlYWRcbiAgLy8gYGltcG9ydC5tZXRhLmVudi5WSVRFX1NVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVlgLCB3aGljaCBjYXVzZWQgVml0ZSB0b1xuICAvLyBpbmxpbmUgdGhlIHZhbHVlIGludG8gdGhlIGNsaWVudCBidW5kbGUgd2hlbmV2ZXIgaXQgd2FzIHNldCBcdTIwMTQgbGVha2luZyBhXG4gIC8vIGZ1bGwtYWRtaW4gY3JlZGVudGlhbCB0byBldmVyeSB2aXNpdG9yLiBUaGUgc2VydmljZSByb2xlIGtleSBpcyBub3cgb25seVxuICAvLyBldmVyIHJlYWQgZnJvbSBgcHJvY2Vzcy5lbnZgIG9uIHRoZSBzZXJ2ZXIgKHNlZVxuICAvLyBgc3JjL2NvbmZpZy9zZXJ2ZXJTZWNyZXRzLmpzYCkuIERvIG5vdCByZS1hZGQgYSBnZXR0ZXIgaGVyZSB0aGF0XG4gIC8vIHJlZmVyZW5jZXMgYGltcG9ydC5tZXRhLmVudmAgZm9yIHRoaXMga2V5LlxuICBnZXQgc3VwYWJhc2VCdWNrZXQoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBpbXBvcnQubWV0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgaW1wb3J0Lm1ldGEuZW52XG4gICAgICA/IGltcG9ydC5tZXRhLmVudi5WSVRFX1NVUEFCQVNFX0JVQ0tFVFxuICAgICAgOiB0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvY2Vzcy5lbnZcbiAgICAgICAgPyBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX0JVQ0tFVFxuICAgICAgICA6IHVuZGVmaW5lZDtcbiAgfSxcbiAgZ2V0IGFwcFVybCgpIHtcbiAgICBjb25zdCBlbnZVcmwgPSAodHlwZW9mIGltcG9ydC5tZXRhICE9PSAndW5kZWZpbmVkJyAmJiBpbXBvcnQubWV0YS5lbnZcbiAgICAgID8gaW1wb3J0Lm1ldGEuZW52LlZJVEVfQVBQX1VSTFxuICAgICAgOiB0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvY2Vzcy5lbnZcbiAgICAgICAgPyBwcm9jZXNzLmVudi5WSVRFX0FQUF9VUkxcbiAgICAgICAgOiB1bmRlZmluZWQpO1xuXG4gICAgY29uc3QgaGFzV2luZG93ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmxvY2F0aW9uICYmIHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG4gICAgY29uc3QgYWN0dWFsT3JpZ2luID0gaGFzV2luZG93ID8gd2luZG93LmxvY2F0aW9uLm9yaWdpbiA6IG51bGw7XG5cbiAgICAvLyBUaGUgcmVkaXJlY3QgVVJMIGZvciBhdXRoIGVtYWlscyBNVVNUIHBvaW50IGF0IHdoZXJlIHRoZSBhcHAgaXMgQUNUVUFMTFlcbiAgICAvLyBydW5uaW5nIFx1MjAxNCB0aGF0IGlzIHdoZXJlIHRoZSB1c2VyJ3MgYnJvd3NlciBpcyByaWdodCBub3csIGFuZCB0aGF0IGlzIHdoZXJlXG4gICAgLy8gdGhlIGNvbmZpcm1hdGlvbiBsaW5rIGhhcyB0byBicmluZyB0aGVtIGJhY2sgdG8uIEEgY29tbW9uIHByb2R1Y3Rpb24gYnVnXG4gICAgLy8gaXMgc2hpcHBpbmcgd2l0aCBWSVRFX0FQUF9VUkwgc3RpbGwgc2V0IHRvIGh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCAoY29waWVkXG4gICAgLy8gZnJvbSAuZW52LmV4YW1wbGUpOyBpZiB3ZSBwcmVmZXJyZWQgZW52VXJsIHVuY29uZGl0aW9uYWxseSwgdGhlXG4gICAgLy8gY29uZmlybWF0aW9uIGVtYWlsIHdvdWxkIHJlZGlyZWN0IHVzZXJzIHRvIGxvY2FsaG9zdCBpbiBwcm9kdWN0aW9uIGFuZFxuICAgIC8vIGJyZWFrIHRoZSBmbG93LiBTbzpcbiAgICAvLyAgIC0gSWYgYSBicm93c2VyIG9yaWdpbiBpcyBhdmFpbGFibGUsIGl0IGlzIHRoZSBncm91bmQgdHJ1dGguIFdlIG9ubHlcbiAgICAvLyAgICAgcHJlZmVyIGEgY29uZmlndXJlZCBlbnZVcmwgd2hlbiBpdCBpcyBjb25zaXN0ZW50IHdpdGggKGEgcHJlZml4IG9mKVxuICAgIC8vICAgICB0aGUgcmVhbCBvcmlnaW4sIE9SIHdoZW4gdGhlcmUgaXMgbm8gYnJvd3NlciB0byBjb21wYXJlIGFnYWluc3QuXG4gICAgLy8gICAtIEEgbG9jYWxob3N0IGVudlVybCBpcyBuZXZlciB0cnVzdGVkIG91dHNpZGUgYW4gYWN0dWFsIGxvY2FsaG9zdFxuICAgIC8vICAgICBvcmlnaW4sIHdoaWNoIGtpbGxzIHRoZSBcInJlZGlyZWN0cyB0byBsb2NhbGhvc3QgaW4gcHJvZHVjdGlvblwiIGRlZmVjdFxuICAgIC8vICAgICBhdCB0aGUgcm9vdCwgcmVnYXJkbGVzcyBvZiBob3cgLmVudiBpcyBjb25maWd1cmVkLlxuICAgIGlmIChhY3R1YWxPcmlnaW4pIHtcbiAgICAgIGNvbnN0IG5vcm1hbGl6ZWRFbnYgPSBlbnZVcmwgPyBTdHJpbmcoZW52VXJsKS5yZXBsYWNlKC9cXC8kLywgJycpIDogbnVsbDtcbiAgICAgIGNvbnN0IGVudklzQ29uc2lzdGVudCA9ICEhbm9ybWFsaXplZEVudiAmJiBhY3R1YWxPcmlnaW4uc3RhcnRzV2l0aChub3JtYWxpemVkRW52KTtcbiAgICAgIGNvbnN0IGVudklzTG9jYWxob3N0ID0gISFub3JtYWxpemVkRW52ICYmIC9eaHR0cHM/OlxcL1xcLyhsb2NhbGhvc3R8MTI3XFwuMFxcLjBcXC4xKShbOi9dfCQpLy50ZXN0KG5vcm1hbGl6ZWRFbnYpO1xuICAgICAgY29uc3QgYWN0dWFsSXNMb2NhbGhvc3QgPSAvXmh0dHBzPzpcXC9cXC8obG9jYWxob3N0fDEyN1xcLjBcXC4wXFwuMSkoWzovXXwkKS8udGVzdChhY3R1YWxPcmlnaW4pO1xuICAgICAgaWYgKGVudklzQ29uc2lzdGVudCkgcmV0dXJuIG5vcm1hbGl6ZWRFbnY7XG4gICAgICAvLyBlbnYgZGlzYWdyZWVzIHdpdGggdGhlIHJlYWwgb3JpZ2luLCBPUiBlbnYgaXMgbG9jYWxob3N0IHdoaWxlIGFjdHVhbGx5XG4gICAgICAvLyBkZXBsb3llZCBcdTIxOTIgdXNlIHRoZSByZWFsIG9yaWdpbi4gVGhpcyBpcyB0aGUgcHJvZHVjdGlvbi1zYWZlIGNob2ljZSBhbmRcbiAgICAgIC8vIGtpbGxzIHRoZSBcInJlZGlyZWN0cyB0byBsb2NhbGhvc3QgaW4gcHJvZHVjdGlvblwiIGRlZmVjdCBhdCB0aGUgcm9vdC5cbiAgICAgIGlmICghZW52SXNMb2NhbGhvc3QgfHwgYWN0dWFsSXNMb2NhbGhvc3QpIHJldHVybiBhY3R1YWxPcmlnaW47XG4gICAgICByZXR1cm4gYWN0dWFsT3JpZ2luO1xuICAgIH1cblxuICAgIC8vIE5vIGJyb3dzZXIgKFNTUiAvIE5vZGUgLyB0ZXN0cykgXHUyMDE0IGZhbGwgYmFjayB0byBlbnYsIHRoZW4gYSBzYW5lIGRlZmF1bHQuXG4gICAgcmV0dXJuIGVudlVybCB8fCAnaHR0cDovL2xvY2FsaG9zdDozMDAwJztcbiAgfSxcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNTdXBhYmFzZUVuYWJsZWQoKSB7XG4gIHJldHVybiAhIShjb25maWcuc3VwYWJhc2VVcmwgJiYgY29uZmlnLnN1cGFiYXNlQW5vbktleSk7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkg6XFxcXGNvZGVcXFxcU21hcnRcXFxcQ29yZVhcXFxcc3JjXFxcXGNvbmZpZ1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiSDpcXFxcY29kZVxcXFxTbWFydFxcXFxDb3JlWFxcXFxzcmNcXFxcY29uZmlnXFxcXHNlcnZlclNlY3JldHMuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0g6L2NvZGUvU21hcnQvQ29yZVgvc3JjL2NvbmZpZy9zZXJ2ZXJTZWNyZXRzLmpzXCI7Ly8gU2VydmVyLW9ubHkgc2VjcmV0IGFjY2Vzc29ycy5cbi8vXG4vLyBUaGVzZSB2YWx1ZXMgY29tZSBmcm9tIHRoZSBkZXBsb3ltZW50IHBsYXRmb3JtJ3MgZW52aXJvbm1lbnQgKHByb2Nlc3MuZW52KVxuLy8gYW5kIG11c3QgTkVWRVIgYmUgZXhwb3NlZCB0byB0aGUgYnJvd3NlciBidW5kbGUuIFRoZXkgYXJlIGRlbGliZXJhdGVseSBpbiBhXG4vLyBzZXBhcmF0ZSBtb2R1bGUgZnJvbSBgc3JjL2NvbmZpZy9pbmRleC5qc2AgKHdoaWNoIGlzIGltcG9ydGVkIGJ5IGNsaWVudFxuLy8gY29kZSkgc28gdGhhdCBubyBzdGF0aWMgYGltcG9ydC5tZXRhLmVudi5WSVRFX1NVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVlgXG4vLyByZWZlcmVuY2UgY2FuIHB1bGwgdGhlIHNlY3JldCBpbnRvIHRoZSBjbGllbnQgYnVpbGQuIE9ubHkgc2VydmVyLXNpZGUgY29kZVxuLy8gKHNlcnZlci9hcGkuanMsIHRoZSBWaXRlIGRldiBzZXJ2ZXIgcGx1Z2luKSBpbXBvcnRzIHRoaXMgbW9kdWxlLlxuLy9cbi8vIE5vdGUgb24gdGhlIGVudiB2YXIgbmFtZTogdGhlIGRlcGxveW1lbnQgcGxhdGZvcm0gc3VwcGxpZXMgdGhlIFN1cGFiYXNlXG4vLyBzZXJ2aWNlIHJvbGUga2V5IHVuZGVyIHRoZSBwcm9qZWN0J3MgZW52aXJvbm1lbnQuIFdlIGFjY2VwdCBlaXRoZXIgdGhlXG4vLyBub24tcHJlZml4ZWQgbmFtZSBTVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZICh0aGUgc3RhbmRhcmQgU3VwYWJhc2UgQ0kvQ0Rcbi8vIGNvbnZlbnRpb24pIG9yIHRoZSBsZWdhY3kgVklURV9TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZIGZvciBiYWNrd2FyZFxuLy8gY29tcGF0aWJpbGl0eSB3aXRoIGV4aXN0aW5nIGRlcGxveW1lbnRzIFx1MjAxNCBidXQgYmVjYXVzZSB0aGlzIG1vZHVsZSByZWFkcyB2aWFcbi8vIGBwcm9jZXNzLmVudmAgKHNlcnZlciBydW50aW1lKSByYXRoZXIgdGhhbiBgaW1wb3J0Lm1ldGEuZW52YCAoYnVpbGQtdGltZVxuLy8gY2xpZW50IGlubGluaW5nKSwgbmVpdGhlciBuYW1lIGxlYWtzIGludG8gdGhlIGJyb3dzZXIgYnVuZGxlLlxuZXhwb3J0IGZ1bmN0aW9uIGdldFN1cGFiYXNlU2VydmljZVJvbGVLZXkoKSB7XG4gIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiB1bmRlZmluZWQ7XG4gIHJldHVybiAoXG4gICAgcHJvY2Vzcy5lbnYuU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWSB8fFxuICAgIHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWSB8fFxuICAgIHVuZGVmaW5lZFxuICApO1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJIOlxcXFxjb2RlXFxcXFNtYXJ0XFxcXENvcmVYXFxcXHNlcnZlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiSDpcXFxcY29kZVxcXFxTbWFydFxcXFxDb3JlWFxcXFxzZXJ2ZXJcXFxcYXBpLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9IOi9jb2RlL1NtYXJ0L0NvcmVYL3NlcnZlci9hcGkuanNcIjtleHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlQXBpUmVxdWVzdChyZXEsIHJlcywgZGIpIHtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChyZXEudXJsLCBgaHR0cDovLyR7cmVxLmhlYWRlcnMuaG9zdH1gKTtcbiAgY29uc3QgcGF0aCA9IHVybC5wYXRobmFtZTtcbiAgY29uc3QgbWV0aG9kID0gcmVxLm1ldGhvZC50b1VwcGVyQ2FzZSgpO1xuXG4gIGxldCBib2R5ID0gJyc7XG4gIHJlcS5vbignZGF0YScsIChjaHVuaykgPT4geyBib2R5ICs9IGNodW5rOyB9KTtcbiAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XG4gICAgbGV0IHBhcnNlZDtcbiAgICB0cnkgeyBwYXJzZWQgPSBib2R5ID8gSlNPTi5wYXJzZShib2R5KSA6IHt9OyB9IGNhdGNoIHsgcGFyc2VkID0ge307IH1cblxuICAgIGNvbnN0IHNlbmQgPSAoc3RhdHVzLCBkYXRhKSA9PiB7XG4gICAgICByZXMud3JpdGVIZWFkKHN0YXR1cywgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHRva2VuID0gcmVxLmhlYWRlcnMuYXV0aG9yaXphdGlvbj8ucmVwbGFjZSgnQmVhcmVyICcsICcnKSB8fCAnJztcbiAgICBsZXQgY3VycmVudFVzZXIgPSBudWxsO1xuICAgIGlmICh0b2tlbikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcGFydHMgPSB0b2tlbi5zcGxpdCgnLicpO1xuICAgICAgICBpZiAocGFydHMubGVuZ3RoID09PSAzKSB7XG4gICAgICAgICAgY3VycmVudFVzZXIgPSBKU09OLnBhcnNlKEJ1ZmZlci5mcm9tKHBhcnRzWzFdLCAnYmFzZTY0JykudG9TdHJpbmcoKSk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja1Blcm1pc3Npb24ocGVybSkge1xuICAgICAgaWYgKCFjdXJyZW50VXNlcikgcmV0dXJuIHNlbmQoNDAxLCB7IGVycm9yOiAnQXV0aGVudGljYXRpb24gcmVxdWlyZWQuJyB9KTtcbiAgICAgIGlmICghY3VycmVudFVzZXIucGVybWlzc2lvbnM/LmluY2x1ZGVzKHBlcm0pICYmICFjdXJyZW50VXNlci5wZXJtaXNzaW9ucz8uaW5jbHVkZXMoJyonKSkge1xuICAgICAgICBzZW5kKDQwMywgeyBlcnJvcjogJ0ZvcmJpZGRlbi4nIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgaWYgKGRiLmlzU3VwYWJhc2UpIHtcbiAgICAgICAgYXdhaXQgaGFuZGxlU3VwYWJhc2UoZGIuc3VwYWJhc2UsIHBhdGgsIG1ldGhvZCwgcGFyc2VkLCBzZW5kLCBjdXJyZW50VXNlciwgdG9rZW4pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXdhaXQgaGFuZGxlTWVtb3J5KGRiLCBwYXRoLCBtZXRob2QsIHBhcnNlZCwgc2VuZCwgY3VycmVudFVzZXIpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgc2VuZCg1MDAsIHsgZXJyb3I6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3IuJyB9KTtcbiAgICB9XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVNZW1vcnkoZGIsIHBhdGgsIG1ldGhvZCwgcGFyc2VkLCBzZW5kLCBjdXJyZW50VXNlcikge1xuICBmdW5jdGlvbiBjaGVja1Blcm1pc3Npb24ocGVybSkge1xuICAgIGlmICghY3VycmVudFVzZXIpIHsgc2VuZCg0MDEsIHsgZXJyb3I6ICdBdXRoZW50aWNhdGlvbiByZXF1aXJlZC4nIH0pOyByZXR1cm4gZmFsc2U7IH1cbiAgICBpZiAoIWN1cnJlbnRVc2VyLnBlcm1pc3Npb25zPy5pbmNsdWRlcyhwZXJtKSAmJiAhY3VycmVudFVzZXIucGVybWlzc2lvbnM/LmluY2x1ZGVzKCcqJykpIHtcbiAgICAgIHNlbmQoNDAzLCB7IGVycm9yOiAnRm9yYmlkZGVuLicgfSk7IHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAocGF0aCA9PT0gJy9hcGkvYXV0aC9sb2dpbicgJiYgbWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgZGIudXNlcnMuZmluZEJ5RW1haWwocGFyc2VkLmlkZW50aWZpZXIpO1xuICAgIGlmICghdXNlcikgcmV0dXJuIHNlbmQoNDAxLCB7IGVycm9yOiAnSW52YWxpZCBjcmVkZW50aWFscy4nIH0pO1xuICAgIGNvbnN0IHsgcGFzc3dvcmRfaGFzaCwgLi4uc2FmZSB9ID0gdXNlcjtcbiAgICBjb25zdCBwYXlsb2FkID0geyBpZDogdXNlci5pZCwgcm9sZTogdXNlci5yb2xlLCBwZXJtaXNzaW9uczogdXNlci5wZXJtaXNzaW9ucyB8fCBbXSB9O1xuICAgIGNvbnN0IGhlYWRlciA9IEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KHsgYWxnOiAnSFMyNTYnIH0pKS50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgY29uc3QgYm9keUI2NCA9IEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KHBheWxvYWQpKS50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHVzZXI6IHNhZmUsIHRva2VuOiBgJHtoZWFkZXJ9LiR7Ym9keUI2NH0uc2lnYCB9KTtcbiAgfVxuXG4gIGlmIChwYXRoID09PSAnL2FwaS9hdXRoL3JlZ2lzdGVyJyAmJiBtZXRob2QgPT09ICdQT1NUJykge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gYXdhaXQgZGIudXNlcnMuZmluZEJ5RW1haWwocGFyc2VkLmVtYWlsKTtcbiAgICBpZiAoZXhpc3RpbmcpIHJldHVybiBzZW5kKDQwOSwgeyBlcnJvcjogJ0VtYWlsIGFscmVhZHkgcmVnaXN0ZXJlZC4nIH0pO1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBkYi51c2Vycy5jcmVhdGUoe1xuICAgICAgbmFtZTogcGFyc2VkLm5hbWUsIGVtYWlsOiBwYXJzZWQuZW1haWwsIHBob25lOiBwYXJzZWQucGhvbmUgfHwgJycsXG4gICAgICBwYXNzd29yZF9oYXNoOiBwYXJzZWQucGFzc3dvcmQsIHJvbGU6IHBhcnNlZC5yb2xlIHx8ICd1c2VyJyxcbiAgICAgIHBlcm1pc3Npb25zOiBbXSwgc3RhdHVzOiAnYWN0aXZlJyxcbiAgICB9KTtcbiAgICBpZiAoIXVzZXIpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogJ1JlZ2lzdHJhdGlvbiBmYWlsZWQuJyB9KTtcbiAgICBjb25zdCB7IHBhc3N3b3JkX2hhc2gsIC4uLnNhZmUgfSA9IHVzZXI7XG4gICAgY29uc3QgcGF5bG9hZCA9IHsgaWQ6IHVzZXIuaWQsIHJvbGU6IHVzZXIucm9sZSwgcGVybWlzc2lvbnM6IHVzZXIucGVybWlzc2lvbnMgfHwgW10gfTtcbiAgICBjb25zdCBoZWFkZXIgPSBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeSh7IGFsZzogJ0hTMjU2JyB9KSkudG9TdHJpbmcoJ2Jhc2U2NCcpO1xuICAgIGNvbnN0IGJvZHlCNjQgPSBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShwYXlsb2FkKSkudG9TdHJpbmcoJ2Jhc2U2NCcpO1xuICAgIHJldHVybiBzZW5kKDIwMSwgeyB1c2VyOiBzYWZlLCB0b2tlbjogYCR7aGVhZGVyfS4ke2JvZHlCNjR9LnNpZ2AsIG5vdGljZTogJ0FjY291bnQgY3JlYXRlZCBzdWNjZXNzZnVsbHkuJyB9KTtcbiAgfVxuXG4gIGlmIChwYXRoID09PSAnL2FwaS9hdXRoL2xvZ291dCcgJiYgbWV0aG9kID09PSAnUE9TVCcpIHJldHVybiBzZW5kKDIwMCwgeyBvazogdHJ1ZSB9KTtcbiAgaWYgKHBhdGggPT09ICcvYXBpL2F1dGgvbWUnICYmIG1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICBpZiAoIWN1cnJlbnRVc2VyKSByZXR1cm4gc2VuZCg0MDEsIHsgZXJyb3I6ICdOb3QgYXV0aGVudGljYXRlZC4nIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyB1c2VyOiBjdXJyZW50VXNlciB9KTtcbiAgfVxuXG4gIGlmIChtZXRob2QgPT09ICdHRVQnICYmIHBhdGggPT09ICcvYXBpL3JvbGVzJykge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdyb2xlOnJlYWQnKSkgcmV0dXJuO1xuICAgIGNvbnN0IHJvbGVzID0gYXdhaXQgZGIucm9sZXMuZmluZEFsbChjdXJyZW50VXNlcik7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHJvbGVzIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3JvbGVzXFwvKC4rKSQvKSkge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdyb2xlOnJlYWQnKSkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3JvbGVzXFwvKC4rKSQvKVsxXTtcbiAgICBjb25zdCByb2xlID0gYXdhaXQgZGIucm9sZXMuZmluZEJ5SWQoaWQsIGN1cnJlbnRVc2VyKTtcbiAgICBpZiAoIXJvbGUpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ1JvbGUgbm90IGZvdW5kLicgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHJvbGUgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnUE9TVCcgJiYgcGF0aCA9PT0gJy9hcGkvcm9sZXMnKSB7XG4gICAgaWYgKCFjaGVja1Blcm1pc3Npb24oJ3JvbGU6Y3JlYXRlJykpIHJldHVybjtcbiAgICBjb25zdCByb2xlID0gYXdhaXQgZGIucm9sZXMuY3JlYXRlKHBhcnNlZCwgY3VycmVudFVzZXIpO1xuICAgIGlmICghcm9sZSkgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiAnRmFpbGVkIHRvIGNyZWF0ZSByb2xlLicgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAxLCB7IHJvbGUgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnUFVUJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvcm9sZXNcXC8oLispJC8pKSB7XG4gICAgaWYgKCFjaGVja1Blcm1pc3Npb24oJ3JvbGU6dXBkYXRlJykpIHJldHVybjtcbiAgICBjb25zdCBpZCA9IHBhdGgubWF0Y2goL15cXC9hcGlcXC9yb2xlc1xcLyguKykkLylbMV07XG4gICAgY29uc3Qgcm9sZSA9IGF3YWl0IGRiLnJvbGVzLnVwZGF0ZShpZCwgcGFyc2VkLCBjdXJyZW50VXNlcik7XG4gICAgaWYgKCFyb2xlKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdSb2xlIG5vdCBmb3VuZC4nIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyByb2xlIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ0RFTEVURScgJiYgcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3JvbGVzXFwvKC4rKSQvKSkge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdyb2xlOmRlbGV0ZScpKSByZXR1cm47XG4gICAgY29uc3QgaWQgPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvcm9sZXNcXC8oLispJC8pWzFdO1xuICAgIGNvbnN0IG9rID0gYXdhaXQgZGIucm9sZXMuZGVsZXRlKGlkLCBjdXJyZW50VXNlcik7XG4gICAgaWYgKCFvaykgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnUm9sZSBub3QgZm91bmQuJyB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgb2s6IHRydWUgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnR0VUJyAmJiBwYXRoID09PSAnL2FwaS91c2VycycpIHtcbiAgICBpZiAoIWNoZWNrUGVybWlzc2lvbigndXNlcjpyZWFkJykpIHJldHVybjtcbiAgICBjb25zdCB1c2VycyA9IGF3YWl0IGRiLnVzZXJzLmZpbmRBbGwoY3VycmVudFVzZXIpO1xuICAgIGNvbnN0IHNhZmUgPSB1c2Vycy5tYXAoKHUpID0+IHsgY29uc3QgeyBwYXNzd29yZF9oYXNoLCAuLi5yZXN0IH0gPSB1OyByZXR1cm4gcmVzdDsgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHVzZXJzOiBzYWZlIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3VzZXJzXFwvKC4rKSQvKSkge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCd1c2VyOnJlYWQnKSkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3VzZXJzXFwvKC4rKSQvKVsxXTtcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgZGIudXNlcnMuZmluZEJ5SWQoaWQsIGN1cnJlbnRVc2VyKTtcbiAgICBpZiAoIXVzZXIpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ1VzZXIgbm90IGZvdW5kLicgfSk7XG4gICAgY29uc3QgeyBwYXNzd29yZF9oYXNoLCAuLi5zYWZlIH0gPSB1c2VyO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyB1c2VyOiBzYWZlIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ1BPU1QnICYmIHBhdGggPT09ICcvYXBpL3VzZXJzJykge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCd1c2VyOmNyZWF0ZScpKSByZXR1cm47XG4gICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCBkYi51c2Vycy5maW5kQnlFbWFpbChwYXJzZWQuZW1haWwpO1xuICAgIGlmIChleGlzdGluZykgcmV0dXJuIHNlbmQoNDA5LCB7IGVycm9yOiAnRW1haWwgYWxyZWFkeSBpbiB1c2UuJyB9KTtcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgZGIudXNlcnMuY3JlYXRlKHBhcnNlZCwgY3VycmVudFVzZXIpO1xuICAgIGlmICghdXNlcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiAnRmFpbGVkIHRvIGNyZWF0ZSB1c2VyLicgfSk7XG4gICAgY29uc3QgeyBwYXNzd29yZF9oYXNoLCAuLi5zYWZlIH0gPSB1c2VyO1xuICAgIHJldHVybiBzZW5kKDIwMSwgeyB1c2VyOiBzYWZlIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ1BVVCcgJiYgcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3VzZXJzXFwvKC4rKSQvKSkge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCd1c2VyOnVwZGF0ZScpKSByZXR1cm47XG4gICAgY29uc3QgaWQgPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvdXNlcnNcXC8oLispJC8pWzFdO1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBkYi51c2Vycy51cGRhdGUoaWQsIHBhcnNlZCwgY3VycmVudFVzZXIpO1xuICAgIGlmICghdXNlcikgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnVXNlciBub3QgZm91bmQuJyB9KTtcbiAgICBjb25zdCB7IHBhc3N3b3JkX2hhc2gsIC4uLnNhZmUgfSA9IHVzZXI7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHVzZXI6IHNhZmUgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnREVMRVRFJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvdXNlcnNcXC8oLispJC8pKSB7XG4gICAgaWYgKCFjaGVja1Blcm1pc3Npb24oJ3VzZXI6ZGVsZXRlJykpIHJldHVybjtcbiAgICBjb25zdCBpZCA9IHBhdGgubWF0Y2goL15cXC9hcGlcXC91c2Vyc1xcLyguKykkLylbMV07XG4gICAgY29uc3Qgb2sgPSBhd2FpdCBkYi51c2Vycy5kZWxldGUoaWQsIGN1cnJlbnRVc2VyKTtcbiAgICBpZiAoIW9rKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdVc2VyIG5vdCBmb3VuZC4nIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBvazogdHJ1ZSB9KTtcbiAgfVxuXG4gIGlmIChtZXRob2QgPT09ICdHRVQnICYmIHBhdGggPT09ICcvYXBpL3NldHRpbmdzJykge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdzZXR0aW5nczpyZWFkJykpIHJldHVybjtcbiAgICBjb25zdCBzZXR0aW5ncyA9IGF3YWl0IGRiLnNldHRpbmdzLmdldEFsbCgpO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBzZXR0aW5ncyB9KTtcbiAgfVxuXG4gIGlmIChtZXRob2QgPT09ICdQVVQnICYmIHBhdGggPT09ICcvYXBpL3NldHRpbmdzJykge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdzZXR0aW5nczp1cGRhdGUnKSkgcmV0dXJuO1xuICAgIGF3YWl0IGRiLnNldHRpbmdzLnVwZGF0ZShwYXJzZWQpO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBvazogdHJ1ZSB9KTtcbiAgfVxuXG4gIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ05vdCBmb3VuZC4nIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVTdXBhYmFzZShzdXBhYmFzZSwgcGF0aCwgbWV0aG9kLCBwYXJzZWQsIHNlbmQsIGN1cnJlbnRVc2VyKSB7XG4gIGZ1bmN0aW9uIGNwKHBlcm0pIHtcbiAgICBpZiAoIWN1cnJlbnRVc2VyKSB7IHNlbmQoNDAxLCB7IGVycm9yOiAnQXV0aGVudGljYXRpb24gcmVxdWlyZWQuJyB9KTsgcmV0dXJuIGZhbHNlOyB9XG4gICAgaWYgKCFjdXJyZW50VXNlci5wZXJtaXNzaW9ucz8uaW5jbHVkZXMocGVybSkgJiYgIWN1cnJlbnRVc2VyLnBlcm1pc3Npb25zPy5pbmNsdWRlcygnKicpKSB7XG4gICAgICBzZW5kKDQwMywgeyBlcnJvcjogJ0ZvcmJpZGRlbi4nIH0pOyByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKHBhdGggPT09ICcvYXBpL2F1dGgvbG9naW4nICYmIG1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5zaWduSW5XaXRoUGFzc3dvcmQoe1xuICAgICAgZW1haWw6IHBhcnNlZC5pZGVudGlmaWVyLCBwYXNzd29yZDogcGFyc2VkLnBhc3N3b3JkLFxuICAgIH0pO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNDAxLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwge1xuICAgICAgdXNlcjogeyBpZDogZGF0YS51c2VyLmlkLCBlbWFpbDogZGF0YS51c2VyLmVtYWlsLCByb2xlOiBkYXRhLnVzZXIudXNlcl9tZXRhZGF0YT8ucm9sZSB8fCAndXNlcicsIHBlcm1pc3Npb25zOiBkYXRhLnVzZXIudXNlcl9tZXRhZGF0YT8ucGVybWlzc2lvbnMgfHwgW10gfSxcbiAgICAgIHRva2VuOiBkYXRhLnNlc3Npb24uYWNjZXNzX3Rva2VuLFxuICAgIH0pO1xuICB9XG5cbiAgaWYgKHBhdGggPT09ICcvYXBpL2F1dGgvcmVnaXN0ZXInICYmIG1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5zaWduVXAoe1xuICAgICAgZW1haWw6IHBhcnNlZC5lbWFpbCwgcGFzc3dvcmQ6IHBhcnNlZC5wYXNzd29yZCxcbiAgICAgIG9wdGlvbnM6IHsgZGF0YTogeyBuYW1lOiBwYXJzZWQubmFtZSwgcGhvbmU6IHBhcnNlZC5waG9uZSwgcm9sZTogcGFyc2VkLnJvbGUgfHwgJ3VzZXInLCBwZXJtaXNzaW9uczogW10gfSB9LFxuICAgIH0pO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNDAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMSwge1xuICAgICAgdXNlcjogeyBpZDogZGF0YS51c2VyLmlkLCBlbWFpbDogcGFyc2VkLmVtYWlsLCByb2xlOiBwYXJzZWQucm9sZSB8fCAndXNlcicsIHBlcm1pc3Npb25zOiBbXSB9LFxuICAgICAgdG9rZW46IGRhdGEuc2Vzc2lvbj8uYWNjZXNzX3Rva2VuIHx8ICcnLFxuICAgICAgbm90aWNlOiAnQWNjb3VudCBjcmVhdGVkLicsXG4gICAgfSk7XG4gIH1cblxuICBpZiAocGF0aCA9PT0gJy9hcGkvYXV0aC9sb2dvdXQnICYmIG1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgYXdhaXQgc3VwYWJhc2UuYXV0aC5zaWduT3V0KCk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IG9rOiB0cnVlIH0pO1xuICB9XG5cbiAgaWYgKHBhdGggPT09ICcvYXBpL2F1dGgvbWUnICYmIG1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICBjb25zdCB7IGRhdGEgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcihjdXJyZW50VXNlcj8uaWQgPyBjdXJyZW50VXNlci5pZCA6IHVuZGVmaW5lZCk7XG4gICAgaWYgKCFkYXRhPy51c2VyKSByZXR1cm4gc2VuZCg0MDEsIHsgZXJyb3I6ICdOb3QgYXV0aGVudGljYXRlZC4nIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyB1c2VyOiB7IGlkOiBkYXRhLnVzZXIuaWQsIGVtYWlsOiBkYXRhLnVzZXIuZW1haWwsIHJvbGU6IGRhdGEudXNlci51c2VyX21ldGFkYXRhPy5yb2xlIHx8ICd1c2VyJywgcGVybWlzc2lvbnM6IGRhdGEudXNlci51c2VyX21ldGFkYXRhPy5wZXJtaXNzaW9ucyB8fCBbXSB9IH0pO1xuICB9XG5cbiAgY29uc3QgYWRtaW5DbGllbnQgPSBhd2FpdCBhZG1pblN1cGFiYXNlKCk7XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aCA9PT0gJy9hcGkvcm9sZXMnKSB7XG4gICAgaWYgKCFjcCgncm9sZTpyZWFkJykpIHJldHVybjtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdyb2xlcycpLnNlbGVjdCgnKicpO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyByb2xlczogZGF0YSB8fCBbXSB9KTtcbiAgfVxuXG4gIGlmIChtZXRob2QgPT09ICdHRVQnICYmIHBhdGgubWF0Y2goL15cXC9hcGlcXC9yb2xlc1xcLyguKykkLykpIHtcbiAgICBpZiAoIWNwKCdyb2xlOnJlYWQnKSkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3JvbGVzXFwvKC4rKSQvKVsxXTtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdyb2xlcycpLnNlbGVjdCgnKicpLmVxKCdpZCcsIGlkKS5zaW5nbGUoKTtcbiAgICBpZiAoZXJyb3IgfHwgIWRhdGEpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ1JvbGUgbm90IGZvdW5kLicgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHJvbGU6IGRhdGEgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnUE9TVCcgJiYgcGF0aCA9PT0gJy9hcGkvcm9sZXMnKSB7XG4gICAgaWYgKCFjcCgncm9sZTpjcmVhdGUnKSkgcmV0dXJuO1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ3JvbGVzJykuaW5zZXJ0KHBhcnNlZCkuc2VsZWN0KCkuc2luZ2xlKCk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4gc2VuZCg1MDAsIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAxLCB7IHJvbGU6IGRhdGEgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnUFVUJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvcm9sZXNcXC8oLispJC8pKSB7XG4gICAgaWYgKCFjcCgncm9sZTp1cGRhdGUnKSkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3JvbGVzXFwvKC4rKSQvKVsxXTtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdyb2xlcycpLnVwZGF0ZShwYXJzZWQpLmVxKCdpZCcsIGlkKS5zZWxlY3QoKS5zaW5nbGUoKTtcbiAgICBpZiAoZXJyb3IgfHwgIWRhdGEpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ1JvbGUgbm90IGZvdW5kLicgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHJvbGU6IGRhdGEgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnREVMRVRFJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvcm9sZXNcXC8oLispJC8pKSB7XG4gICAgaWYgKCFjcCgncm9sZTpkZWxldGUnKSkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3JvbGVzXFwvKC4rKSQvKVsxXTtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdyb2xlcycpLmRlbGV0ZSgpLmVxKCdpZCcsIGlkKTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgb2s6IHRydWUgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnR0VUJyAmJiBwYXRoID09PSAnL2FwaS91c2VycycpIHtcbiAgICBpZiAoIWNwKCd1c2VyOnJlYWQnKSkgcmV0dXJuO1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ3VzZXJzJykuc2VsZWN0KCcqJyk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4gc2VuZCg1MDAsIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHVzZXJzOiBkYXRhIHx8IFtdIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3VzZXJzXFwvKC4rKSQvKSkge1xuICAgIGlmICghY3AoJ3VzZXI6cmVhZCcpKSByZXR1cm47XG4gICAgY29uc3QgaWQgPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvdXNlcnNcXC8oLispJC8pWzFdO1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ3VzZXJzJykuc2VsZWN0KCcqJykuZXEoJ2lkJywgaWQpLnNpbmdsZSgpO1xuICAgIGlmIChlcnJvciB8fCAhZGF0YSkgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnVXNlciBub3QgZm91bmQuJyB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgdXNlcjogZGF0YSB9KTtcbiAgfVxuXG4gIGlmIChtZXRob2QgPT09ICdQT1NUJyAmJiBwYXRoID09PSAnL2FwaS91c2VycycpIHtcbiAgICBpZiAoIWNwKCd1c2VyOmNyZWF0ZScpKSByZXR1cm47XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgndXNlcnMnKS5pbnNlcnQocGFyc2VkKS5zZWxlY3QoKS5zaW5nbGUoKTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDEsIHsgdXNlcjogZGF0YSB9KTtcbiAgfVxuXG4gIGlmIChtZXRob2QgPT09ICdQVVQnICYmIHBhdGgubWF0Y2goL15cXC9hcGlcXC91c2Vyc1xcLyguKykkLykpIHtcbiAgICBpZiAoIWNwKCd1c2VyOnVwZGF0ZScpKSByZXR1cm47XG4gICAgY29uc3QgaWQgPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvdXNlcnNcXC8oLispJC8pWzFdO1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ3VzZXJzJykudXBkYXRlKHBhcnNlZCkuZXEoJ2lkJywgaWQpLnNlbGVjdCgpLnNpbmdsZSgpO1xuICAgIGlmIChlcnJvciB8fCAhZGF0YSkgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnVXNlciBub3QgZm91bmQuJyB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgdXNlcjogZGF0YSB9KTtcbiAgfVxuXG4gIGlmIChtZXRob2QgPT09ICdERUxFVEUnICYmIHBhdGgubWF0Y2goL15cXC9hcGlcXC91c2Vyc1xcLyguKykkLykpIHtcbiAgICBpZiAoIWNwKCd1c2VyOmRlbGV0ZScpKSByZXR1cm47XG4gICAgY29uc3QgaWQgPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvdXNlcnNcXC8oLispJC8pWzFdO1xuICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ3VzZXJzJykuZGVsZXRlKCkuZXEoJ2lkJywgaWQpO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBvazogdHJ1ZSB9KTtcbiAgfVxuXG4gIGlmIChtZXRob2QgPT09ICdHRVQnICYmIHBhdGggPT09ICcvYXBpL3NldHRpbmdzJykge1xuICAgIGlmICghY3AoJ3NldHRpbmdzOnJlYWQnKSkgcmV0dXJuO1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ3NldHRpbmdzJykuc2VsZWN0KCcqJyk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4gc2VuZCg1MDAsIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgY29uc3Qgc2V0dGluZ3MgPSB7fTtcbiAgICAoZGF0YSB8fCBbXSkuZm9yRWFjaCgocm93KSA9PiB7IHNldHRpbmdzW3Jvdy5rZXldID0gcm93LnZhbHVlOyB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgc2V0dGluZ3MgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnUFVUJyAmJiBwYXRoID09PSAnL2FwaS9zZXR0aW5ncycpIHtcbiAgICBpZiAoIWNwKCdzZXR0aW5nczp1cGRhdGUnKSkgcmV0dXJuO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHBhcnNlZCkpIHtcbiAgICAgIGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ3NldHRpbmdzJykudXBzZXJ0KHsga2V5LCB2YWx1ZSB9LCB7IG9uQ29uZmxpY3Q6ICdrZXknIH0pO1xuICAgIH1cbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgb2s6IHRydWUgfSk7XG4gIH1cblxuICByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdOb3QgZm91bmQuJyB9KTtcbn1cblxubGV0IF9hZG1pblN1cGFiYXNlID0gbnVsbDtcbmFzeW5jIGZ1bmN0aW9uIGFkbWluU3VwYWJhc2UoKSB7XG4gIGlmIChfYWRtaW5TdXBhYmFzZSkgcmV0dXJuIF9hZG1pblN1cGFiYXNlO1xuICBjb25zdCB7IGNyZWF0ZUNsaWVudCB9ID0gYXdhaXQgaW1wb3J0KCdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnKTtcbiAgY29uc3QgeyBjb25maWcgfSA9IGF3YWl0IGltcG9ydCgnLi4vc3JjL2NvbmZpZy9pbmRleC5qcycpO1xuICAvLyBUaGUgc2VydmljZSByb2xlIGtleSBpcyBhIGZ1bGwtYWRtaW4gc2VjcmV0IGFuZCBtdXN0IE5FVkVSIGJlIHJlYWQgZnJvbVxuICAvLyB0aGUgY2xpZW50IGJ1bmRsZS4gSXQgY29tZXMgZXhjbHVzaXZlbHkgZnJvbSB0aGUgZGVwbG95bWVudCBwbGF0Zm9ybSdzXG4gIC8vIHByb2Nlc3MuZW52IHZpYSB0aGUgc2VydmVyLW9ubHkgYWNjZXNzb3IuIFNlZSBzcmMvY29uZmlnL3NlcnZlclNlY3JldHMuanMuXG4gIGNvbnN0IHsgZ2V0U3VwYWJhc2VTZXJ2aWNlUm9sZUtleSB9ID0gYXdhaXQgaW1wb3J0KCcuLi9zcmMvY29uZmlnL3NlcnZlclNlY3JldHMuanMnKTtcbiAgY29uc3Qgc2VydmljZVJvbGVLZXkgPSBnZXRTdXBhYmFzZVNlcnZpY2VSb2xlS2V5KCk7XG4gIGlmICghc2VydmljZVJvbGVLZXkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1N1cGFiYXNlIHNlcnZpY2Ugcm9sZSBrZXkgaXMgbm90IGNvbmZpZ3VyZWQgb24gdGhlIHNlcnZlciAocHJvY2Vzcy5lbnYuU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWSkuIEFkbWluaXN0cmF0aXZlIEFQSSBvcGVyYXRpb25zIHJlcXVpcmUgaXQuJyk7XG4gIH1cbiAgX2FkbWluU3VwYWJhc2UgPSBjcmVhdGVDbGllbnQoY29uZmlnLnN1cGFiYXNlVXJsLCBzZXJ2aWNlUm9sZUtleSwge1xuICAgIGF1dGg6IHsgYXV0b1JlZnJlc2hUb2tlbjogZmFsc2UsIHBlcnNpc3RTZXNzaW9uOiBmYWxzZSB9LFxuICB9KTtcbiAgcmV0dXJuIF9hZG1pblN1cGFiYXNlO1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJIOlxcXFxjb2RlXFxcXFNtYXJ0XFxcXENvcmVYXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJIOlxcXFxjb2RlXFxcXFNtYXJ0XFxcXENvcmVYXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9IOi9jb2RlL1NtYXJ0L0NvcmVYL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IGFwaVBsdWdpbiBmcm9tICcuL3NlcnZlci9wbHVnaW4uanMnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgYXBpUGx1Z2luKCldLFxuICBidWlsZDoge1xuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIGV4dGVybmFsOiBbJ3BnJywgJ3NxbGl0ZTMnLCAnc3FsaXRlJ10sXG4gICAgfSxcbiAgfSxcbn0pO1xuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJIOlxcXFxjb2RlXFxcXFNtYXJ0XFxcXENvcmVYXFxcXHNlcnZlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiSDpcXFxcY29kZVxcXFxTbWFydFxcXFxDb3JlWFxcXFxzZXJ2ZXJcXFxccGx1Z2luLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9IOi9jb2RlL1NtYXJ0L0NvcmVYL3NlcnZlci9wbHVnaW4uanNcIjtpbXBvcnQgeyBsb2FkRW52IH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgeyBpbml0RGF0YWJhc2UgfSBmcm9tICcuLi9zcmMvZGF0YS9pbmRleC5qcyc7XG5cbmxldCBkYiA9IG51bGw7XG5cbmFzeW5jIGZ1bmN0aW9uIGVuc3VyZURiKG1vZGUpIHtcbiAgaWYgKGRiKSByZXR1cm4gZGI7XG4gIC8vIExvYWQgQk9USCBWSVRFXy1wcmVmaXhlZCB2YXJzIChwdWJsaWMsIHNhZmUgZm9yIHRoZSBjbGllbnQgYnVuZGxlKSBBTkRcbiAgLy8gbm9uLXByZWZpeGVkIHNlcnZlci1vbmx5IHNlY3JldHMgKGUuZy4gU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWSkgaW50b1xuICAvLyBwcm9jZXNzLmVudi4gVGhlIHNlY3JldCBsaXZlcyBvbmx5IGluIHByb2Nlc3MuZW52IG9uIHRoZSBzZXJ2ZXIgYW5kIGlzXG4gIC8vIHJlYWQgdmlhIHNyYy9jb25maWcvc2VydmVyU2VjcmV0cy5qcyBcdTIwMTQgaXQgaXMgbmV2ZXIgcmVmZXJlbmNlZCB0aHJvdWdoXG4gIC8vIGltcG9ydC5tZXRhLmVudiwgc28gVml0ZSBuZXZlciBpbmxpbmVzIGl0IGludG8gdGhlIGNsaWVudCBidW5kbGUuXG4gIGNvbnN0IHZpdGVFbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICdWSVRFXycpO1xuICBjb25zdCBzZXJ2ZXJFbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKTtcbiAgT2JqZWN0LmFzc2lnbihwcm9jZXNzLmVudiwgdml0ZUVudiwgc2VydmVyRW52KTtcbiAgZGIgPSBhd2FpdCBpbml0RGF0YWJhc2Uodml0ZUVudi5WSVRFX0RBVEFCQVNFX1BST1ZJREVSIHx8ICdzdXBhYmFzZScsIHtcbiAgICB1cmw6IHZpdGVFbnYuVklURV9TVVBBQkFTRV9VUkwsXG4gICAgYW5vbktleTogdml0ZUVudi5WSVRFX1NVUEFCQVNFX0FOT05fS0VZLFxuICB9KTtcbiAgcmV0dXJuIGRiO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBhcGlQbHVnaW4oKSB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ2NvcmV4LWFwaScsXG4gICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgaWYgKHJlcS51cmwuc3RhcnRzV2l0aCgnL2FwaS8nKSkge1xuICAgICAgICAgIGNvbnN0IGRiYXNlID0gYXdhaXQgZW5zdXJlRGIoc2VydmVyLmNvbmZpZy5tb2RlKTtcbiAgICAgICAgICBjb25zdCB7IGhhbmRsZUFwaVJlcXVlc3QgfSA9IGF3YWl0IGltcG9ydCgnLi9hcGkuanMnKTtcbiAgICAgICAgICBoYW5kbGVBcGlSZXF1ZXN0KHJlcSwgcmVzLCBkYmFzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LFxuICB9O1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJIOlxcXFxjb2RlXFxcXFNtYXJ0XFxcXENvcmVYXFxcXHNyY1xcXFxkYXRhXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJIOlxcXFxjb2RlXFxcXFNtYXJ0XFxcXENvcmVYXFxcXHNyY1xcXFxkYXRhXFxcXGluZGV4LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9IOi9jb2RlL1NtYXJ0L0NvcmVYL3NyYy9kYXRhL2luZGV4LmpzXCI7aW1wb3J0IHsgY29uZmlnIH0gZnJvbSAnLi4vY29uZmlnL2luZGV4LmpzJztcbmltcG9ydCB7IFN1cGFiYXNlUHJvdmlkZXIgfSBmcm9tICcuL3Byb3ZpZGVycy9TdXBhYmFzZVByb3ZpZGVyLmpzJztcblxubGV0IGRiSW5zdGFuY2UgPSBudWxsO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5pdERhdGFiYXNlKHByb3ZpZGVyVHlwZSwgcHJvdmlkZXJDb25maWcpIHtcbiAgY29uc3QgdHlwZSA9IHByb3ZpZGVyVHlwZSB8fCBjb25maWcuZGF0YWJhc2VQcm92aWRlcjtcbiAgaWYgKHR5cGUgJiYgdHlwZSAhPT0gJ3N1cGFiYXNlJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgZGF0YWJhc2UgcHJvdmlkZXI6ICR7dHlwZX0uIE9ubHkgJ3N1cGFiYXNlJyBpcyBzdXBwb3J0ZWQuYCk7XG4gIH1cblxuICBjb25zdCBjZmcgPSBwcm92aWRlckNvbmZpZyB8fCB7fTtcblxuICBjb25zdCBwcm92aWRlciA9IG5ldyBTdXBhYmFzZVByb3ZpZGVyKCk7XG4gIGF3YWl0IHByb3ZpZGVyLmNvbm5lY3Qoe1xuICAgIHVybDogY2ZnLnVybCB8fCBjb25maWcuc3VwYWJhc2VVcmwsXG4gICAgYW5vbktleTogY2ZnLmFub25LZXkgfHwgY29uZmlnLnN1cGFiYXNlQW5vbktleSxcbiAgfSk7XG5cbiAgY29uc3QgZGIgPSB7XG4gICAgcHJvdmlkZXIsXG4gICAgdXNlcnM6IG51bGwsXG4gICAgcm9sZXM6IG51bGwsXG4gICAgc2V0dGluZ3M6IG51bGwsXG4gICAgcXVlcnk6IChzcWwsIHBhcmFtcykgPT4gcHJvdmlkZXIucXVlcnkoc3FsLCBwYXJhbXMpLFxuICAgIGlzU3VwYWJhc2U6IHRydWUsXG4gICAgc3VwYWJhc2U6IHByb3ZpZGVyLmdldENsaWVudCgpLFxuICAgIF9kYXRhYmFzZU5hbWU6IChjZmcudXJsIHx8IGNvbmZpZy5zdXBhYmFzZVVybCk/Lm1hdGNoKC9odHRwczpcXC9cXC8oW14uXSspLyk/LlsxXSB8fCAnU3VwYWJhc2UnLFxuICB9O1xuXG4gIGRiSW5zdGFuY2UgPSBkYjtcbiAgcmV0dXJuIGRiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGF0YWJhc2UoKSB7XG4gIGlmICghZGJJbnN0YW5jZSkgdGhyb3cgbmV3IEVycm9yKCdEYXRhYmFzZSBub3QgaW5pdGlhbGl6ZWQuIENhbGwgaW5pdERhdGFiYXNlKCkgZmlyc3QuJyk7XG4gIHJldHVybiBkYkluc3RhbmNlO1xufSIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiSDpcXFxcY29kZVxcXFxTbWFydFxcXFxDb3JlWFxcXFxzcmNcXFxcZGF0YVxcXFxwcm92aWRlcnNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkg6XFxcXGNvZGVcXFxcU21hcnRcXFxcQ29yZVhcXFxcc3JjXFxcXGRhdGFcXFxccHJvdmlkZXJzXFxcXGluZGV4LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9IOi9jb2RlL1NtYXJ0L0NvcmVYL3NyYy9kYXRhL3Byb3ZpZGVycy9pbmRleC5qc1wiO2V4cG9ydCBjbGFzcyBEYXRhYmFzZVByb3ZpZGVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uID0gbnVsbDtcbiAgICB0aGlzLnR5cGUgPSBudWxsO1xuICB9XG5cbiAgYXN5bmMgY29ubmVjdChjb25maWcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nvbm5lY3QoKSBtdXN0IGJlIGltcGxlbWVudGVkIGJ5IHByb3ZpZGVyIHN1YmNsYXNzLicpO1xuICB9XG5cbiAgYXN5bmMgcXVlcnkoc3FsLCBwYXJhbXMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3F1ZXJ5KCkgbXVzdCBiZSBpbXBsZW1lbnRlZCBieSBwcm92aWRlciBzdWJjbGFzcy4nKTtcbiAgfVxuXG4gIGFzeW5jIGRpc2Nvbm5lY3QoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdkaXNjb25uZWN0KCkgbXVzdCBiZSBpbXBsZW1lbnRlZCBieSBwcm92aWRlciBzdWJjbGFzcy4nKTtcbiAgfVxufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJIOlxcXFxjb2RlXFxcXFNtYXJ0XFxcXENvcmVYXFxcXHNyY1xcXFxkYXRhXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJIOlxcXFxjb2RlXFxcXFNtYXJ0XFxcXENvcmVYXFxcXHNyY1xcXFxkYXRhXFxcXHNxbFBhcmFtcy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vSDovY29kZS9TbWFydC9Db3JlWC9zcmMvZGF0YS9zcWxQYXJhbXMuanNcIjsvLyBIZWxwZXJzIGZvciBzZXJpYWxpemluZyBKUyB2YWx1ZXMgaW50byBTUUwgbGl0ZXJhbHMgYW5kIGlubGluaW5nIGAkMSwgJDIsIC4uLmBcbi8vIHBsYWNlaG9sZGVycyBpbnRvIGEgcXVlcnkgc3RyaW5nLiBVc2VkIHdoZXJlIGEgc2luZ2xlLXRleHQgU1FMIGFyZ3VtZW50IG11c3Rcbi8vIGNhcnJ5IGJvdW5kIHBhcmFtZXRlcnMgKGUuZy4gdGhlIGBleGVjX3NxbChxdWVyeV90ZXh0IHRleHQpYCBTRUNVUklUWSBERUZJTkVSXG4vLyBSUEMsIHdoaWNoIGNhbm5vdCBhY2NlcHQgc2VwYXJhdGUgYmluZCBwYXJhbXMgdGhyb3VnaCBQb3N0Z1JFU1QpLlxuXG5leHBvcnQgZnVuY3Rpb24gc3FsTGl0ZXJhbCh2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuICdOVUxMJztcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSByZXR1cm4gdmFsdWUgPyAnVFJVRScgOiAnRkFMU0UnO1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykgcmV0dXJuIE51bWJlci5pc0Zpbml0ZSh2YWx1ZSkgPyBTdHJpbmcodmFsdWUpIDogJ05VTEwnO1xuICAvLyBzdHJpbmcgXHUyMDE0IGVzY2FwZSBzaW5nbGUgcXVvdGVzIHBlciBTUUwgc3RhbmRhcmQgKGRvdWJsZWQpIGFuZCB3cmFwIGluIHF1b3Rlcy5cbiAgcmV0dXJuIGAnJHtTdHJpbmcodmFsdWUpLnJlcGxhY2UoLycvZywgXCInJ1wiKX0nYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJpbmRJbmxpbmUoc3FsLCBwYXJhbXMpIHtcbiAgaWYgKCFwYXJhbXMgfHwgcGFyYW1zLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHNxbDtcbiAgbGV0IG91dCA9ICcnO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHNxbC5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbnN0IGNoID0gc3FsW2ldO1xuICAgIGlmIChjaCA9PT0gJyQnICYmIC9bMS05XS8udGVzdChzcWxbaSArIDFdIHx8ICcnKSkge1xuICAgICAgLy8gQ29uc3VtZSB0aGUgZnVsbCBydW4gb2YgZGlnaXRzIHRvIHN1cHBvcnQgJDEuLiQ5IChhbmQgYmV5b25kIGlmIGV2ZXIgdXNlZCkuXG4gICAgICBsZXQgbnVtID0gJyc7XG4gICAgICBsZXQgaiA9IGkgKyAxO1xuICAgICAgd2hpbGUgKGogPCBzcWwubGVuZ3RoICYmIC9bMC05XS8udGVzdChzcWxbal0pKSB7IG51bSArPSBzcWxbal07IGogKz0gMTsgfVxuICAgICAgY29uc3QgcG9zID0gcGFyc2VJbnQobnVtLCAxMCkgLSAxO1xuICAgICAgaWYgKHBvcyA+PSAwICYmIHBvcyA8IHBhcmFtcy5sZW5ndGgpIHtcbiAgICAgICAgb3V0ICs9IHNxbExpdGVyYWwocGFyYW1zW3Bvc10pO1xuICAgICAgICBpID0gaiAtIDE7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cbiAgICBvdXQgKz0gY2g7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiSDpcXFxcY29kZVxcXFxTbWFydFxcXFxDb3JlWFxcXFxzcmNcXFxcZGF0YVxcXFxwcm92aWRlcnNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkg6XFxcXGNvZGVcXFxcU21hcnRcXFxcQ29yZVhcXFxcc3JjXFxcXGRhdGFcXFxccHJvdmlkZXJzXFxcXFN1cGFiYXNlUHJvdmlkZXIuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0g6L2NvZGUvU21hcnQvQ29yZVgvc3JjL2RhdGEvcHJvdmlkZXJzL1N1cGFiYXNlUHJvdmlkZXIuanNcIjtpbXBvcnQgeyBEYXRhYmFzZVByb3ZpZGVyIH0gZnJvbSAnLi9pbmRleC5qcyc7XG5pbXBvcnQgeyBiaW5kSW5saW5lIH0gZnJvbSAnLi4vc3FsUGFyYW1zLmpzJztcblxuLy8gU3VwYWJhc2UgZG9lcyBub3QgZXhwb3NlIGFyYml0cmFyeSBTUUwgb3ZlciBpdHMgUkVTVCBBUEkuIFJhdyBTUUwgZXhlY3V0aW9uXG4vLyBpcyB0aGVyZWZvcmUgcm91dGVkIHRocm91Z2ggdGhlIGBleGVjX3NxbChxdWVyeV90ZXh0IHRleHQpYCBTRUNVUklUWSBERUZJTkVSXG4vLyBmdW5jdGlvbiB0aGF0IHRoZSBzY2hlbWEtaW5zdGFsbGF0aW9uIHNjcmlwdCAoZ2VuZXJhdGUtc3FsLnNxbCkgY3JlYXRlcyBpblxuLy8gdGhlIHRhcmdldCBkYXRhYmFzZS4gYGV4ZWNfc3FsYCBSRVRVUk5TIFNFVE9GIGpzb24sIHNvIFBvc3RnUkVTVCBzdXJmYWNlc1xuLy8gZWFjaCByb3cgYXMgYSBKU09OIG9iamVjdCBcdTIwMTQgd2UgcmVhZCBgLmRhdGFgIGFuZCByZXR1cm4gaXQgYXMgdGhlIHJvd3MgYXJyYXksXG4vLyBtYXRjaGluZyB0aGUgY29udHJhY3QgZXZlcnkgcmVwb3NpdG9yeS9zZXJ2aWNlL3ZhbGlkYXRvciBhbHJlYWR5IGV4cGVjdHNcbi8vIGZyb20gYGRiLnF1ZXJ5KHNxbCwgcGFyYW1zKWAgKHRoZXkgYWxsIGRvIGByZXN1bHRbMF0/LmNvbHVtbmAgLyBgcmVzdWx0Lm1hcGApLlxuLy9cbi8vIEltcG9ydGFudCBmYWlsdXJlIG1vZGVzOlxuLy8gICAtIElmIGBleGVjX3NxbGAgaXMgbm90IGluc3RhbGxlZCB5ZXQgKGRhdGFiYXNlIG5vdCBzZXQgdXApLCB0aGUgUlBDIHJldHVybnNcbi8vICAgICBhIDQyODgzLzQwNCBcImZ1bmN0aW9uIG5vdCBmb3VuZFwiLiBUaGlzIGlzIGEgbGVnaXRpbWF0ZSwgZXhwZWN0ZWQgc3RhdGVcbi8vICAgICBEVVJJTkcgc2V0dXAsIHNvIHdlIHN1cmZhY2UgYSBjbGVhciwgZGVkaWNhdGVkIGVycm9yIHJhdGhlciB0aGFuIGEgcmF3XG4vLyAgICAgUG9zdGdSRVNUIGJsb2IsIGFuZCBsZXQgY2FsbGVycycgdHJ5L2NhdGNoIHRyZWF0IGl0IGFzIFwibm90IHJlYWR5XCIuXG4vLyAgIC0gUGFyYW1ldGVyIGJpbmRpbmc6IHdlIGlubGluZSBwYXJhbWV0ZXJzIGFzIHF1b3RlZC9lc2NhcGVkIGxpdGVyYWxzIGludG9cbi8vICAgICB0aGUgcXVlcnkgdGV4dCBiZWZvcmUgc2VuZGluZywgYmVjYXVzZSBleGVjX3NxbCB0YWtlcyBhIHNpbmdsZSB0ZXh0XG4vLyAgICAgYXJndW1lbnQgYW5kIGNhbm5vdCBhY2NlcHQgYmluZCBwYXJhbWV0ZXJzIHRocm91Z2ggUG9zdGdSRVNULiBUaGlzIGlzXG4vLyAgICAgc2FmZSAod2UgY29udHJvbCBldmVyeSBjYWxsZXIncyBTUUwgYW5kIHZhbHVlcykgYW5kIG1pcnJvcnMgaG93IHRoZVxuLy8gICAgIGZ1bmN0aW9uIGlzIGludGVuZGVkIHRvIGJlIHVzZWQuXG5cbmNvbnN0IEVYRUNfU1FMX05PVF9JTlNUQUxMRURfSElOVCA9XG4gIFwiVGhlICdleGVjX3NxbCcgaGVscGVyIGZ1bmN0aW9uIGlzIG5vdCBpbnN0YWxsZWQgaW4gdGhpcyBkYXRhYmFzZS4gXCIgK1xuICAnUnVuIHRoZSBnZW5lcmF0ZWQgc2NoZW1hIFNRTCAod2hpY2ggYmVnaW5zIHdpdGggQ1JFQVRFIEZVTkNUSU9OIGV4ZWNfc3FsKSAnICtcbiAgJ2luIHRoZSBTdXBhYmFzZSBTUUwgRWRpdG9yLCB0aGVuIHRyeSBhZ2Fpbi4nO1xuXG5leHBvcnQgY2xhc3MgU3VwYWJhc2VQcm92aWRlciBleHRlbmRzIERhdGFiYXNlUHJvdmlkZXIge1xuICBhc3luYyBjb25uZWN0KGNvbmZpZykge1xuICAgIHRoaXMudHlwZSA9ICdzdXBhYmFzZSc7XG4gICAgY29uc3QgeyBjcmVhdGVDbGllbnQgfSA9IGF3YWl0IGltcG9ydCgnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJyk7XG4gICAgdGhpcy5jbGllbnQgPSBjcmVhdGVDbGllbnQoY29uZmlnLnVybCwgY29uZmlnLmFub25LZXkpO1xuICB9XG5cbiAgYXN5bmMgcXVlcnkoc3FsLCBwYXJhbXMgPSBbXSkge1xuICAgIGlmICghdGhpcy5jbGllbnQpIHRocm93IG5ldyBFcnJvcignU3VwYWJhc2Ugbm90IGNvbm5lY3RlZC4gQ2FsbCBjb25uZWN0KCkgZmlyc3QuJyk7XG5cbiAgICBjb25zdCBxdWVyeVRleHQgPSBiaW5kSW5saW5lKHNxbCwgcGFyYW1zKTtcblxuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHRoaXMuY2xpZW50LnJwYygnZXhlY19zcWwnLCB7IHF1ZXJ5X3RleHQ6IHF1ZXJ5VGV4dCB9KTtcblxuICAgIGlmIChlcnJvcikge1xuICAgICAgLy8gUEdSU1QyMDIgLyA0Mjg4MzogXCJDb3VsZCBub3QgZmluZCB0aGUgZnVuY3Rpb24gcHVibGljLmV4ZWNfc3FsXCIgXHUyMDE0IGhhcHBlbnNcbiAgICAgIC8vIGJlZm9yZSB0aGUgc2NoZW1hIGlzIGluc3RhbGxlZC4gVHJlYXQgYXMgYSBkZWRpY2F0ZWQsIHJlY29nbml6YWJsZSBlcnJvci5cbiAgICAgIGNvbnN0IGNvZGUgPSBlcnJvci5jb2RlIHx8ICcnO1xuICAgICAgY29uc3QgbWVzc2FnZSA9IChlcnJvci5tZXNzYWdlIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgY29uc3Qgbm90SW5zdGFsbGVkID1cbiAgICAgICAgY29kZSA9PT0gJ1BHUlNUMjAyJyB8fFxuICAgICAgICBjb2RlID09PSAnNDI4ODMnIHx8XG4gICAgICAgIG1lc3NhZ2UuaW5jbHVkZXMoJ2V4ZWNfc3FsJykgfHxcbiAgICAgICAgbWVzc2FnZS5pbmNsdWRlcygnY291bGQgbm90IGZpbmQgdGhlIGZ1bmN0aW9uJyk7XG4gICAgICBpZiAobm90SW5zdGFsbGVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihFWEVDX1NRTF9OT1RfSU5TVEFMTEVEX0hJTlQpO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yLm1lc3NhZ2UgfHwgJ1N1cGFiYXNlIFJQQyBleGVjX3NxbCBmYWlsZWQuJyk7XG4gICAgfVxuXG4gICAgLy8gZXhlY19zcWwgUkVUVVJOUyBTRVRPRiBqc29uIFx1MjE5MiBQb3N0Z1JFU1QgcmV0dXJucyBhbiBhcnJheSBvZiByb3cgb2JqZWN0cy5cbiAgICAvLyBXaGVuIHRoZSB1bmRlcmx5aW5nIHN0YXRlbWVudCByZXR1cm5zIG5vIHJvd3MsIGBkYXRhYCBpcyBhbiBlbXB0eSBhcnJheS5cbiAgICByZXR1cm4gQXJyYXkuaXNBcnJheShkYXRhKSA/IGRhdGEgOiBbXTtcbiAgfVxuXG4gIGdldENsaWVudCgpIHtcbiAgICBpZiAoIXRoaXMuY2xpZW50KSB0aHJvdyBuZXcgRXJyb3IoJ1N1cGFiYXNlIG5vdCBjb25uZWN0ZWQuIENhbGwgY29ubmVjdCgpIGZpcnN0LicpO1xuICAgIHJldHVybiB0aGlzLmNsaWVudDtcbiAgfVxuXG4gIHRhYmxlKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRDbGllbnQoKS5mcm9tKG5hbWUpO1xuICB9XG5cbiAgYXN5bmMgZGlzY29ubmVjdCgpIHtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBcUdPLFNBQVMsb0JBQW9CO0FBQ2xDLFNBQU8sQ0FBQyxFQUFFLE9BQU8sZUFBZSxPQUFPO0FBQ3pDO0FBdkdBLElBQXlSO0FBQXpSO0FBQUE7QUFBbVIsSUFBTSxTQUFTLE9BQU8sT0FBTztBQUFBLE1BQzlTLElBQUksZUFBZTtBQUNqQixlQUFPLE9BQU8sZ0JBQWdCLGVBQWUsWUFBWSxNQUNyRCxZQUFZLElBQUkscUJBQ2hCLE9BQU8sWUFBWSxlQUFlLFFBQVEsTUFDeEMsUUFBUSxJQUFJLHFCQUNaO0FBQUEsTUFDUjtBQUFBLE1BQ0EsSUFBSSxtQkFBbUI7QUFDckIsZUFBTyxPQUFPLGdCQUFnQixlQUFlLFlBQVksTUFDckQsWUFBWSxJQUFJLHlCQUNoQixPQUFPLFlBQVksZUFBZSxRQUFRLE1BQ3hDLFFBQVEsSUFBSSx5QkFDWjtBQUFBLE1BQ1I7QUFBQSxNQUNBLElBQUksa0JBQWtCO0FBQ3BCLGVBQU8sT0FBTyxnQkFBZ0IsZUFBZSxZQUFZLE1BQ3JELFlBQVksSUFBSSx3QkFDaEIsT0FBTyxZQUFZLGVBQWUsUUFBUSxNQUN4QyxRQUFRLElBQUksd0JBQ1o7QUFBQSxN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
