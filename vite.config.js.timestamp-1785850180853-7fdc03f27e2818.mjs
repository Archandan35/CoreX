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

// src/data/providers/index.js
var DatabaseProvider;
var init_providers = __esm({
  "src/data/providers/index.js"() {
    DatabaseProvider = class {
      constructor() {
        this.connection = null;
        this.type = null;
      }
      async connect(_config) {
        throw new Error("connect() must be implemented by provider subclass.");
      }
      async query(_sql, _params) {
        throw new Error("query() must be implemented by provider subclass.");
      }
      async disconnect() {
        throw new Error("disconnect() must be implemented by provider subclass.");
      }
    };
  }
});

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
var init_sqlParams = __esm({
  "src/data/sqlParams.js"() {
  }
});

// src/identity/auth/supabaseClient.js
function getStored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
async function getSupabaseClient() {
  if (client) return client;
  if (clientPromise) return clientPromise;
  const supabaseUrl = config.supabaseUrl || getStored("supabase_url");
  const supabaseAnonKey = config.supabaseAnonKey || getStored("supabase_anon_key");
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  clientPromise = (async () => {
    const { createClient } = await import("file:///H:/code/CoreX/node_modules/@supabase/supabase-js/dist/index.mjs");
    client = createClient(supabaseUrl, supabaseAnonKey);
    return client;
  })();
  return clientPromise;
}
var client, clientPromise;
var init_supabaseClient = __esm({
  "src/identity/auth/supabaseClient.js"() {
    init_config();
    client = null;
    clientPromise = null;
  }
});

// src/data/providers/SupabaseProvider.js
var EXEC_SQL_NOT_INSTALLED_HINT, SupabaseProvider;
var init_SupabaseProvider = __esm({
  "src/data/providers/SupabaseProvider.js"() {
    init_providers();
    init_sqlParams();
    init_supabaseClient();
    EXEC_SQL_NOT_INSTALLED_HINT = "The 'exec_sql' helper function is not installed in this database. Run the generated schema SQL in the Supabase SQL Editor, then try again.";
    SupabaseProvider = class extends DatabaseProvider {
      async connect() {
        this.type = "supabase";
        if (this.client) return;
        this.client = await getSupabaseClient();
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
  }
});

// src/data/index.js
var data_exports = {};
__export(data_exports, {
  getDatabase: () => getDatabase,
  initDatabase: () => initDatabase
});
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
function getDatabase() {
  if (!dbInstance) throw new Error("Database not initialized. Call initDatabase() first.");
  return dbInstance;
}
var dbInstance;
var init_data = __esm({
  "src/data/index.js"() {
    init_config();
    init_SupabaseProvider();
    dbInstance = null;
  }
});

// src/audit/AuditService.js
var AuditService_exports = {};
__export(AuditService_exports, {
  AuditService: () => AuditService,
  auditService: () => auditService
});
var AuditService, auditService;
var init_AuditService = __esm({
  "src/audit/AuditService.js"() {
    init_data();
    AuditService = class {
      async logChange({ setting, oldValue, newValue, userId }) {
        try {
          const db2 = getDatabase();
          await db2.query(
            `INSERT INTO audit_logs (setting, old_value, new_value, changed_by, changed_at)
         VALUES ($1, $2, $3, $4, NOW())`,
            [setting, JSON.stringify(oldValue), JSON.stringify(newValue), userId]
          );
        } catch {
        }
      }
    };
    auditService = new AuditService();
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
import crypto from "crypto";
async function handleApiRequest(req2, res, db2) {
  const url = new URL(req2.url, `http://${req2.headers.host}`);
  const path = url.pathname;
  const method = req2.method.toUpperCase();
  let body = "";
  req2.on("data", (chunk) => {
    body += chunk;
  });
  req2.on("end", async () => {
    let parsed;
    try {
      parsed = body ? JSON.parse(body) : {};
    } catch {
      parsed = {};
    }
    const send = (status, data) => {
      if (res.headersSent) return;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };
    const token = req2.headers.authorization?.replace("Bearer ", "") || "";
    let currentUser = null;
    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const raw = JSON.parse(Buffer.from(parts[1], "base64").toString());
          const meta = raw.user_metadata || raw.app_metadata || {};
          currentUser = {
            ...raw,
            id: raw.sub || raw.id,
            permissions: raw.permissions || meta.permissions || [],
            full_access: raw.full_access === true || meta.full_access === true,
            role: raw.role || meta.role || "user"
          };
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
        const handled = await handleInvoiceMemory(db2, path, method, parsed, send, currentUser);
        if (!handled) await handleMemory(db2, path, method, parsed, send, currentUser);
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
    const oldSettings = await db2.settings.getAll();
    const stringified = {};
    for (const [key, value] of Object.entries(parsed)) {
      stringified[key] = typeof value === "string" ? value : JSON.stringify(value);
    }
    await db2.settings.update(stringified);
    for (const [key, value] of Object.entries(parsed)) {
      const oldVal = oldSettings?.[key];
      if (oldVal !== void 0 && oldVal !== value) {
        try {
          const { auditService: auditService2 } = await Promise.resolve().then(() => (init_AuditService(), AuditService_exports));
          await auditService2.logChange({ setting: key, oldValue: oldVal, newValue: value, userId: currentUser?.id });
        } catch {
        }
      }
    }
    return send(200, { ok: true });
  }
  if (method === "GET" && path === "/api/languages") {
    return send(200, {
      languages: [
        { code: "en", name: "English", nativeName: "English" },
        { code: "es", name: "Spanish", nativeName: "Espa\xF1ol" },
        { code: "fr", name: "French", nativeName: "Fran\xE7ais" },
        { code: "de", name: "German", nativeName: "Deutsch" },
        { code: "pt", name: "Portuguese", nativeName: "Portugu\xEAs" },
        { code: "it", name: "Italian", nativeName: "Italiano" },
        { code: "nl", name: "Dutch", nativeName: "Nederlands" },
        { code: "pl", name: "Polish", nativeName: "Polski" },
        { code: "ru", name: "Russian", nativeName: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439" },
        { code: "ja", name: "Japanese", nativeName: "\u65E5\u672C\u8A9E" },
        { code: "ko", name: "Korean", nativeName: "\uD55C\uAD6D\uC5B4" },
        { code: "zh", name: "Chinese (Simplified)", nativeName: "\u7B80\u4F53\u4E2D\u6587" },
        { code: "ar", name: "Arabic", nativeName: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" },
        { code: "hi", name: "Hindi", nativeName: "\u0939\u093F\u0928\u094D\u0926\u0940" },
        { code: "bn", name: "Bengali", nativeName: "\u09AC\u09BE\u0982\u09B2\u09BE" }
      ]
    });
  }
  if (method === "POST" && path === "/api/settings/logo") {
    if (!checkPermission("settings:update")) return;
    if (!parsed.fileData) return send(400, { error: "No file data provided." });
    await db2.settings.update({ logo: parsed.fileData });
    return send(200, { ok: true, logo: parsed.fileData });
  }
  const PREFIX_STORE_KEY = "_prefix_settings";
  async function loadPrefixes() {
    if (db2.settings) {
      const all = await db2.settings.getAll();
      const raw = all[PREFIX_STORE_KEY];
      if (raw) {
        try {
          return typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch {
        }
      }
    }
    return [];
  }
  async function savePrefixes(items) {
    if (db2.settings) {
      await db2.settings.update({ [PREFIX_STORE_KEY]: JSON.stringify(items) });
    }
  }
  if (path === "/api/prefix-settings" && method === "GET") {
    if (!checkPermission("settings:read")) return;
    let items = await loadPrefixes();
    if (parsed.active === "true") items = items.filter((p) => p.isActive !== false);
    if (parsed.default === "true") items = items.filter((p) => p.isDefault === true);
    if (parsed.docType) items = items.filter((p) => p.docType === parsed.docType);
    if (parsed.q) {
      const q = parsed.q.toLowerCase();
      items = items.filter((p) => (p.value || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q));
    }
    const sortField = parsed.sortField || "sequenceOrder";
    const sortDir = parsed.sortDir || "asc";
    items = [...items].sort((a, b) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      if (typeof va === "string") return sortDir === "desc" ? vb.localeCompare(va) : va.localeCompare(vb);
      return sortDir === "desc" ? vb - va : va - vb;
    });
    const pageSize = parseInt(parsed.pageSize, 10) || 10;
    const pageNum = parseInt(parsed.page, 10) || 1;
    const total = items.length;
    const paged = items.slice((pageNum - 1) * pageSize, pageNum * pageSize);
    return send(200, { items: paged, total });
  }
  if (path === "/api/prefix-settings" && method === "POST") {
    if (!checkPermission("settings:update")) return;
    const items = await loadPrefixes();
    const prefix = {
      ...parsed,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (prefix.isDefault) {
      items.forEach((p) => {
        p.isDefault = false;
      });
    }
    items.push(prefix);
    await savePrefixes(items);
    return send(201, { prefix });
  }
  const psMatch = path.match(/^\/api\/prefix-settings\/([^/]+)$/);
  if (psMatch) {
    const id = psMatch[1];
    if (method === "PUT") {
      if (!checkPermission("settings:update")) return;
      const items = await loadPrefixes();
      const idx = items.findIndex((p) => p.id === id);
      if (idx === -1) return send(404, { error: "Prefix not found." });
      if (parsed.isDefault) {
        items.forEach((p) => {
          p.isDefault = false;
        });
      }
      items[idx] = { ...items[idx], ...parsed, id };
      await savePrefixes(items);
      return send(200, { prefix: items[idx] });
    }
    if (method === "DELETE") {
      if (!checkPermission("settings:delete")) return;
      const items = await loadPrefixes();
      const idx = items.findIndex((p) => p.id === id);
      if (idx === -1) return send(404, { error: "Prefix not found." });
      items.splice(idx, 1);
      await savePrefixes(items);
      return send(200, { ok: true });
    }
  }
  const psDefaultMatch = path.match(/^\/api\/prefix-settings\/([^/]+)\/default$/);
  if (psDefaultMatch) {
    if (method === "POST") {
      if (!checkPermission("settings:update")) return;
      const id = psDefaultMatch[1];
      const items = await loadPrefixes();
      const idx = items.findIndex((p) => p.id === id);
      if (idx === -1) return send(404, { error: "Prefix not found." });
      items.forEach((p) => {
        p.isDefault = false;
      });
      items[idx].isDefault = true;
      await savePrefixes(items);
      return send(200, { prefix: items[idx] });
    }
  }
  const SUFFIX_STORE_KEY = "_suffix_settings";
  async function loadSuffixes() {
    if (db2.settings) {
      const all = await db2.settings.getAll();
      const raw = all[SUFFIX_STORE_KEY];
      if (raw) {
        try {
          return typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch {
        }
      }
    }
    return [];
  }
  async function saveSuffixes(items) {
    if (db2.settings) {
      await db2.settings.update({ [SUFFIX_STORE_KEY]: JSON.stringify(items) });
    }
  }
  if (path === "/api/suffix-settings" && method === "GET") {
    if (!checkPermission("settings:read")) return;
    let items = await loadSuffixes();
    if (parsed.active === "true") items = items.filter((p) => p.isActive !== false);
    if (parsed.default === "true") items = items.filter((p) => p.isDefault === true);
    if (parsed.docType) items = items.filter((p) => p.docType === parsed.docType);
    if (parsed.q) {
      const q = parsed.q.toLowerCase();
      items = items.filter((p) => (p.value || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q));
    }
    const sortField = parsed.sortField || "sequenceOrder";
    const sortDir = parsed.sortDir || "asc";
    items = [...items].sort((a, b) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      if (typeof va === "string") return sortDir === "desc" ? vb.localeCompare(va) : va.localeCompare(vb);
      return sortDir === "desc" ? vb - va : va - vb;
    });
    const pageSize = parseInt(parsed.pageSize, 10) || 10;
    const pageNum = parseInt(parsed.page, 10) || 1;
    const total = items.length;
    const paged = items.slice((pageNum - 1) * pageSize, pageNum * pageSize);
    return send(200, { items: paged, total });
  }
  if (path === "/api/suffix-settings" && method === "POST") {
    if (!checkPermission("settings:update")) return;
    const items = await loadSuffixes();
    const suffix = {
      ...parsed,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (suffix.isDefault) items.forEach((p) => {
      p.isDefault = false;
    });
    items.push(suffix);
    await saveSuffixes(items);
    return send(201, { suffix });
  }
  const ssMatch = path.match(/^\/api\/suffix-settings\/([^/]+)$/);
  if (ssMatch) {
    const id = ssMatch[1];
    if (method === "PUT") {
      if (!checkPermission("settings:update")) return;
      const items = await loadSuffixes();
      const idx = items.findIndex((p) => p.id === id);
      if (idx === -1) return send(404, { error: "Suffix not found." });
      if (parsed.isDefault) items.forEach((p) => {
        p.isDefault = false;
      });
      items[idx] = { ...items[idx], ...parsed, id };
      await saveSuffixes(items);
      return send(200, { suffix: items[idx] });
    }
    if (method === "DELETE") {
      if (!checkPermission("settings:delete")) return;
      const items = await loadSuffixes();
      const idx = items.findIndex((p) => p.id === id);
      if (idx === -1) return send(404, { error: "Suffix not found." });
      items.splice(idx, 1);
      await saveSuffixes(items);
      return send(200, { ok: true });
    }
  }
  const ssDefaultMatch = path.match(/^\/api\/suffix-settings\/([^/]+)\/default$/);
  if (ssDefaultMatch) {
    if (method === "POST") {
      if (!checkPermission("settings:update")) return;
      const id = ssDefaultMatch[1];
      const items = await loadSuffixes();
      const idx = items.findIndex((p) => p.id === id);
      if (idx === -1) return send(404, { error: "Suffix not found." });
      items.forEach((p) => {
        p.isDefault = false;
      });
      items[idx].isDefault = true;
      await saveSuffixes(items);
      return send(200, { suffix: items[idx] });
    }
  }
  const NOTES_STORE_KEY = "_document_notes";
  async function loadNotes() {
    if (db2.settings) {
      const all = await db2.settings.getAll();
      const raw = all[NOTES_STORE_KEY];
      if (raw) {
        try {
          return typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch {
        }
      }
    }
    return [];
  }
  async function saveNotes(items) {
    if (db2.settings) {
      await db2.settings.update({ [NOTES_STORE_KEY]: JSON.stringify(items) });
    }
  }
  if (path === "/api/document-notes" && method === "GET") {
    if (!checkPermission("settings:read")) return;
    let items = await loadNotes();
    if (parsed.docType) items = items.filter((n) => n.docType === parsed.docType);
    if (parsed.q) {
      const q = parsed.q.toLowerCase();
      items = items.filter((n) => (n.content || "").toLowerCase().includes(q) || (n.title || "").toLowerCase().includes(q));
    }
    const sortField = parsed.sortField || "createdAt";
    const sortDir = parsed.sortDir || "desc";
    items = [...items].sort((a, b) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      if (typeof va === "string") return sortDir === "desc" ? vb.localeCompare(va) : va.localeCompare(vb);
      return sortDir === "desc" ? vb - va : va - vb;
    });
    const pageSize = parseInt(parsed.pageSize, 10) || 10;
    const pageNum = parseInt(parsed.page, 10) || 1;
    const total = items.length;
    const paged = items.slice((pageNum - 1) * pageSize, pageNum * pageSize);
    return send(200, { items: paged, total });
  }
  if (path === "/api/document-notes" && method === "POST") {
    if (!checkPermission("settings:update")) return;
    const items = await loadNotes();
    const note = { ...parsed, id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2), createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    items.push(note);
    await saveNotes(items);
    return send(201, { note });
  }
  const noteMatch = path.match(/^\/api\/document-notes\/([^/]+)$/);
  if (noteMatch) {
    const id = noteMatch[1];
    if (method === "PUT") {
      if (!checkPermission("settings:update")) return;
      const items = await loadNotes();
      const idx = items.findIndex((n) => n.id === id);
      if (idx === -1) return send(404, { error: "Note not found." });
      items[idx] = { ...items[idx], ...parsed, id };
      await saveNotes(items);
      return send(200, { note: items[idx] });
    }
    if (method === "DELETE") {
      if (!checkPermission("settings:delete")) return;
      const items = await loadNotes();
      const idx = items.findIndex((n) => n.id === id);
      if (idx === -1) return send(404, { error: "Note not found." });
      items.splice(idx, 1);
      await saveNotes(items);
      return send(200, { ok: true });
    }
  }
  const TERMS_STORE_KEY = "_document_terms";
  async function loadTerms() {
    if (db2.settings) {
      const all = await db2.settings.getAll();
      const raw = all[TERMS_STORE_KEY];
      if (raw) {
        try {
          return typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch {
        }
      }
    }
    return [];
  }
  async function saveTerms(items) {
    if (db2.settings) {
      await db2.settings.update({ [TERMS_STORE_KEY]: JSON.stringify(items) });
    }
  }
  if (path === "/api/document-terms" && method === "GET") {
    if (!checkPermission("settings:read")) return;
    let items = await loadTerms();
    if (parsed.docType) items = items.filter((t) => t.docType === parsed.docType);
    if (parsed.q) {
      const q = parsed.q.toLowerCase();
      items = items.filter((t) => (t.content || "").toLowerCase().includes(q) || (t.title || "").toLowerCase().includes(q));
    }
    const sortField = parsed.sortField || "createdAt";
    const sortDir = parsed.sortDir || "desc";
    items = [...items].sort((a, b) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      if (typeof va === "string") return sortDir === "desc" ? vb.localeCompare(va) : va.localeCompare(vb);
      return sortDir === "desc" ? vb - va : va - vb;
    });
    const pageSize = parseInt(parsed.pageSize, 10) || 10;
    const pageNum = parseInt(parsed.page, 10) || 1;
    const total = items.length;
    const paged = items.slice((pageNum - 1) * pageSize, pageNum * pageSize);
    return send(200, { items: paged, total });
  }
  if (path === "/api/document-terms" && method === "POST") {
    if (!checkPermission("settings:update")) return;
    const items = await loadTerms();
    const term = { ...parsed, id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2), createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    items.push(term);
    await saveTerms(items);
    return send(201, { term });
  }
  const termMatch = path.match(/^\/api\/document-terms\/([^/]+)$/);
  if (termMatch) {
    const id = termMatch[1];
    if (method === "PUT") {
      if (!checkPermission("settings:update")) return;
      const items = await loadTerms();
      const idx = items.findIndex((t) => t.id === id);
      if (idx === -1) return send(404, { error: "Term not found." });
      items[idx] = { ...items[idx], ...parsed, id };
      await saveTerms(items);
      return send(200, { term: items[idx] });
    }
    if (method === "DELETE") {
      if (!checkPermission("settings:delete")) return;
      const items = await loadTerms();
      const idx = items.findIndex((t) => t.id === id);
      if (idx === -1) return send(404, { error: "Term not found." });
      items.splice(idx, 1);
      await saveTerms(items);
      return send(200, { ok: true });
    }
  }
  const COLUMNS_STORE_KEY = "_product_columns";
  async function loadColumns() {
    if (db2.settings) {
      const all = await db2.settings.getAll();
      const raw = all[COLUMNS_STORE_KEY];
      if (raw) {
        try {
          return typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch {
        }
      }
    }
    return null;
  }
  if (path === "/api/product-columns" && method === "GET") {
    const columns = await loadColumns();
    return send(200, { columns: Array.isArray(columns) ? columns : [] });
  }
  if (path === "/api/product-columns" && method === "PUT") {
    if (!checkPermission("settings:update")) return;
    if (db2.settings) {
      await db2.settings.update({ [COLUMNS_STORE_KEY]: JSON.stringify(parsed.columns || []) });
    }
    return send(200, { ok: true });
  }
  return send(404, { error: "Not found." });
}
async function handleInvoiceMemory(db2, path, method, parsed, send, currentUser) {
  const PERM = {
    CUSTOMER_READ: "customer:read",
    CUSTOMER_CREATE: "customer:create",
    CUSTOMER_UPDATE: "customer:update",
    PRODUCT_READ: "product:read",
    PRODUCT_CREATE: "product:create",
    PRODUCT_UPDATE: "product:update",
    INVOICE_READ: "invoice:read",
    INVOICE_CREATE: "invoice:create",
    INVOICE_UPDATE: "invoice:update",
    INVOICE_DELETE: "invoice:delete"
  };
  const cp = (perm) => {
    if (!currentUser) {
      send(401, { error: "Authentication required." });
      return false;
    }
    if (!currentUser.permissions?.includes(perm) && !currentUser.permissions?.includes("*") && !currentUser.full_access) {
      send(403, { error: "Forbidden." });
      return false;
    }
    return true;
  };
  if (method === "GET" && path === "/api/document-types") {
    return send(200, { types: ["Invoice", "Purchase", "Sales Return", "Purchase Return", "Purchase Order", "Delivery Challan", "Sales Order", "Quotation", "Pro Forma Invoice", "Subscription", "Sales Debit Note"] });
  }
  if (path === "/api/custom-headers" || path.startsWith("/api/custom-headers/")) {
    const HEADER_STORE_KEY = "_custom_headers";
    const loadHeaders = async () => {
      if (db2.settings) {
        const all = await db2.settings.getAll();
        const raw = all[HEADER_STORE_KEY];
        if (raw) {
          try {
            return typeof raw === "string" ? JSON.parse(raw) : raw;
          } catch {
          }
        }
      }
      return [];
    };
    const saveHeaders = async (items) => {
      if (db2.settings) {
        await db2.settings.update({ [HEADER_STORE_KEY]: JSON.stringify(items) });
      }
    };
    if (method === "GET") {
      if (!cp("settings:read")) return true;
      let items = await loadHeaders();
      if (parsed.active === "true") items = items.filter((h) => h.active !== false);
      if (parsed.visible === "true") items = items.filter((h) => h.visible !== false);
      if (parsed.docType) items = items.filter((h) => !h.docTypes || !h.docTypes.length || h.docTypes.includes(parsed.docType));
      const sortField = parsed.sortField || "displayOrder";
      const sortDir = parsed.sortDir || "asc";
      items = [...items].sort((a, b) => {
        const va = a[sortField] ?? 0;
        const vb = b[sortField] ?? 0;
        return sortDir === "desc" ? vb - va : va - vb;
      });
      const pageSize = parseInt(parsed.pageSize, 10) || 200;
      const page = parseInt(parsed.page, 10) || 1;
      const total = items.length;
      const paged = items.slice((page - 1) * pageSize, page * pageSize);
      return send(200, { items: paged, total });
    }
    if (method === "POST") {
      if (!cp("settings:update")) return true;
      const items = await loadHeaders();
      const header = {
        ...parsed,
        id: parsed.id || crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      items.push(header);
      await saveHeaders(items);
      return send(201, { header });
    }
    const idMatch = path.match(/^\/api\/custom-headers\/(.+)$/);
    if (idMatch) {
      const id = idMatch[1];
      if (method === "PUT") {
        if (!cp("settings:update")) return true;
        const items = await loadHeaders();
        const idx = items.findIndex((h) => h.id === id);
        if (idx === -1) return send(404, { error: "Custom header not found." });
        items[idx] = { ...items[idx], ...parsed, id };
        await saveHeaders(items);
        return send(200, { header: items[idx] });
      }
      if (method === "DELETE") {
        if (!cp("settings:delete")) return true;
        const items = await loadHeaders();
        const idx = items.findIndex((h) => h.id === id);
        if (idx === -1) return send(404, { error: "Custom header not found." });
        items.splice(idx, 1);
        await saveHeaders(items);
        return send(200, { ok: true });
      }
    }
    return send(404, { error: "Not found." });
  }
  const isCustomer = path === "/api/customers" || path.startsWith("/api/customers/");
  const isProduct = path === "/api/products" || path.startsWith("/api/products/");
  const isBank = path === "/api/banks" || path.startsWith("/api/banks/");
  const isSignature = path === "/api/signatures" || path.startsWith("/api/signatures/");
  const isInvoice = path === "/api/invoices" || path.startsWith("/api/invoices/");
  if (!isCustomer && !isProduct && !isBank && !isSignature && !isInvoice) return false;
  const have = db2.customers && db2.products && db2.productCategories && db2.banks && db2.signatures && db2.invoices;
  if (!have) {
    send(404, { error: "Invoice domain not available on this provider." });
    return true;
  }
  if (path === "/api/customers" && method === "GET") {
    if (!cp(PERM.CUSTOMER_READ)) return true;
    send(200, { customers: (await db2.customers.findAll(currentUser)).filter(Boolean) });
  } else if (path === "/api/customers" && method === "POST") {
    if (!cp(PERM.CUSTOMER_CREATE)) return true;
    send(201, { customer: await db2.customers.create({ ...parsed, created_by: currentUser.id }, currentUser) });
  } else if (method === "PUT" && path.startsWith("/api/customers/")) {
    if (!cp(PERM.CUSTOMER_UPDATE)) return true;
    const c = await db2.customers.update(path.split("/").pop(), parsed, currentUser);
    if (!c) send(404, { error: "Customer not found." });
    else send(200, { customer: c });
  } else if (path === "/api/products" && method === "GET") {
    if (!cp(PERM.PRODUCT_READ)) return true;
    send(200, { products: (await db2.products.findAll(currentUser)).filter(Boolean), categories: (await db2.productCategories.findAll(currentUser)).filter(Boolean) });
  } else if (path === "/api/products" && method === "POST") {
    if (!cp(PERM.PRODUCT_CREATE)) return true;
    send(201, { product: await db2.products.create({ ...parsed, created_by: currentUser.id }, currentUser) });
  } else if (method === "PUT" && path.startsWith("/api/products/")) {
    if (!cp(PERM.PRODUCT_UPDATE)) return true;
    const p = await db2.products.update(path.split("/").pop(), parsed, currentUser);
    if (!p) send(404, { error: "Product not found." });
    else send(200, { product: p });
  } else if (path === "/api/banks" && method === "GET") {
    if (!cp(PERM.INVOICE_READ)) return true;
    send(200, { banks: (await db2.banks.findAll(currentUser)).filter(Boolean) });
  } else if (path === "/api/banks" && method === "POST") {
    if (!cp(PERM.INVOICE_CREATE)) return true;
    send(201, { bank: await db2.banks.create({ ...parsed, created_by: currentUser.id }, currentUser) });
  } else if (method === "PUT" && path.startsWith("/api/banks/")) {
    if (!cp(PERM.INVOICE_UPDATE)) return true;
    const b = await db2.banks.update(path.split("/").pop(), parsed, currentUser);
    if (!b) send(404, { error: "Bank not found." });
    else send(200, { bank: b });
  } else if (method === "DELETE" && path.startsWith("/api/banks/")) {
    if (!cp(PERM.INVOICE_DELETE)) return true;
    await db2.banks.delete(path.split("/").pop(), currentUser);
    send(200, { ok: true });
  } else if (path === "/api/signatures" && method === "GET") {
    if (!cp(PERM.INVOICE_READ)) return true;
    send(200, { signatures: (await db2.signatures.findAll(currentUser)).filter(Boolean) });
  } else if (path === "/api/signatures" && method === "POST") {
    if (!cp(PERM.INVOICE_CREATE)) return true;
    send(201, { signature: await db2.signatures.create({ ...parsed, created_by: currentUser.id }, currentUser) });
  } else if (method === "DELETE" && path.startsWith("/api/signatures/")) {
    if (!cp(PERM.INVOICE_DELETE)) return true;
    await db2.signatures.delete(path.split("/").pop(), currentUser);
    send(200, { ok: true });
  } else if (path === "/api/invoices/next-number" && method === "GET") {
    if (!cp(PERM.INVOICE_READ)) return true;
    send(200, { number: await db2.invoices.nextNumber(parsed.prefix, currentUser) });
  } else if (path === "/api/invoices" && method === "GET") {
    if (!cp(PERM.INVOICE_READ)) return true;
    send(200, { invoices: await db2.invoices.findAll(currentUser) });
  } else if (path === "/api/invoices" && method === "POST") {
    if (!cp(PERM.INVOICE_CREATE)) return true;
    const result = await db2.invoices.save({ ...parsed, created_by: currentUser.id }, currentUser);
    if (!result.ok) send(409, { error: result.error });
    else send(201, { invoice: result.invoice });
  } else if (method === "GET" && path.startsWith("/api/invoices/")) {
    if (!cp(PERM.INVOICE_READ)) return true;
    const inv = await db2.invoices.findById(path.split("/").pop(), currentUser);
    if (!inv) send(404, { error: "Invoice not found." });
    else send(200, { invoice: inv });
  } else if (method === "PUT" && path.startsWith("/api/invoices/")) {
    if (!cp(PERM.INVOICE_UPDATE)) return true;
    const result = await db2.invoices.save(parsed, currentUser);
    if (!result.ok) send(409, { error: result.error });
    else send(200, { invoice: result.invoice });
  } else if (method === "POST" && path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)\/duplicate$/)) {
    if (!cp(PERM.INVOICE_CREATE)) return true;
    const id = path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)\/duplicate$/)[1];
    const original = await db2.invoices.findById(id, currentUser);
    if (!original) {
      send(404, { error: "Invoice not found." });
      return true;
    }
    const dup = { ...original, id: void 0, invoiceNumber: void 0, created_at: void 0, updated_at: void 0, status: "draft" };
    const result = await db2.invoices.save({ ...dup, created_by: currentUser.id }, currentUser);
    if (!result.ok) send(409, { error: result.error });
    else send(201, { invoice: result.invoice });
  } else if (method === "DELETE" && path.startsWith("/api/invoices/")) {
    if (!cp(PERM.INVOICE_DELETE)) return true;
    await db2.invoices.delete(path.split("/").pop(), currentUser);
    send(200, { ok: true });
  } else {
    send(404, { error: "Not found." });
  }
  return true;
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
    const { data: oldData, error: oldError } = await adminClient.from("settings").select("*");
    const oldSettings = {};
    if (!oldError && oldData) oldData.forEach((row) => {
      oldSettings[row.key] = row.value;
    });
    for (const [key, value] of Object.entries(parsed)) {
      const { error } = await adminClient.from("settings").upsert(
        { key, value: typeof value === "string" ? value : JSON.stringify(value) },
        { onConflict: "key" }
      );
      if (error) return send(500, { error: error.message });
    }
    for (const [key, value] of Object.entries(parsed)) {
      const oldVal = oldSettings?.[key];
      if (oldVal !== void 0 && oldVal !== value) {
        await createAuditLog("settings", key, "updated", { [key]: oldVal }, { [key]: value }, currentUser?.id);
      }
    }
    return send(200, { ok: true });
  }
  if (method === "GET" && path === "/api/languages") {
    return send(200, {
      languages: [
        { code: "en", name: "English", nativeName: "English" },
        { code: "es", name: "Spanish", nativeName: "Espa\xF1ol" },
        { code: "fr", name: "French", nativeName: "Fran\xE7ais" },
        { code: "de", name: "German", nativeName: "Deutsch" },
        { code: "pt", name: "Portuguese", nativeName: "Portugu\xEAs" },
        { code: "it", name: "Italian", nativeName: "Italiano" },
        { code: "nl", name: "Dutch", nativeName: "Nederlands" },
        { code: "pl", name: "Polish", nativeName: "Polski" },
        { code: "ru", name: "Russian", nativeName: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439" },
        { code: "ja", name: "Japanese", nativeName: "\u65E5\u672C\u8A9E" },
        { code: "ko", name: "Korean", nativeName: "\uD55C\uAD6D\uC5B4" },
        { code: "zh", name: "Chinese (Simplified)", nativeName: "\u7B80\u4F53\u4E2D\u6587" },
        { code: "ar", name: "Arabic", nativeName: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" },
        { code: "hi", name: "Hindi", nativeName: "\u0939\u093F\u0928\u094D\u0926\u0940" },
        { code: "bn", name: "Bengali", nativeName: "\u09AC\u09BE\u0982\u09B2\u09BE" }
      ]
    });
  }
  if (method === "POST" && path === "/api/settings/logo") {
    if (!cp("settings:update")) return;
    if (!parsed.fileData) return send(400, { error: "No file data provided." });
    const { error } = await adminClient.from("settings").upsert(
      { key: "logo", value: parsed.fileData },
      { onConflict: "key" }
    );
    if (error) return send(500, { error: error.message });
    await createAuditLog("settings", "logo", "updated", null, { logo: "(image data)" }, currentUser?.id);
    return send(200, { ok: true, logo: parsed.fileData });
  }
  if (method === "GET" && path === "/api/document-types") {
    const { data, error } = await adminClient.from("document_type_master").select("name").order("name", { ascending: true });
    if (error) return send(500, { error: error.message });
    return send(200, { types: (data || []).map((r) => r.name) });
  }
  if (method === "GET" && path === "/api/custom-headers") {
    if (!cp("settings:read")) return;
    let query = adminClient.from("custom_headers").select("*").order("display_order", { ascending: true });
    if (parsed.active === "true") query = query.eq("active", true);
    if (parsed.visible === "true") query = query.eq("visible", true);
    if (parsed.docType) query = query.contains("doc_types", [parsed.docType]);
    const { data, error } = await query;
    if (error) return send(500, { error: error.message });
    const pageSize = parseInt(parsed.pageSize, 10) || 200;
    const page = parseInt(parsed.page, 10) || 1;
    const all = data || [];
    const total = all.length;
    const paged = all.slice((page - 1) * pageSize, page * pageSize);
    return send(200, { items: paged, total });
  }
  if (method === "POST" && path === "/api/custom-headers") {
    if (!cp("settings:update")) return;
    const { data, error } = await adminClient.from("custom_headers").insert(parsed).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { header: data });
  }
  const chMatch = path.match(/^\/api\/custom-headers\/(.+)$/);
  if (chMatch) {
    const id = chMatch[1];
    if (method === "PUT") {
      if (!cp("settings:update")) return;
      const { data, error } = await adminClient.from("custom_headers").update(parsed).eq("id", id).select().single();
      if (error || !data) return send(404, { error: "Custom header not found." });
      return send(200, { header: data });
    }
    if (method === "DELETE") {
      if (!cp("settings:update")) return;
      const { error } = await adminClient.from("custom_headers").delete().eq("id", id);
      if (error) return send(500, { error: error.message });
      return send(200, { ok: true });
    }
  }
  const uid = currentUser?.id;
  const withCreator = (row) => ({ ...row, created_by: row.created_by || uid });
  const clean = (row) => {
    if (!row) return row;
    const { items, payments, ...rest } = row;
    return { ...rest };
  };
  if (method === "GET" && path === "/api/customers") {
    if (!cp("customer:read")) return;
    const { data, error } = await adminClient.from("customers").select("*").order("created_at", { ascending: false });
    if (error) return send(500, { error: error.message });
    return send(200, { customers: data || [] });
  }
  if (method === "POST" && path === "/api/customers") {
    if (!cp("customer:create")) return;
    const { data, error } = await adminClient.from("customers").insert(withCreator(parsed)).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { customer: data });
  }
  if (method === "PUT" && path.match(/^\/api\/customers\/(.+)$/)) {
    if (!cp("customer:update")) return;
    const id = path.match(/^\/api\/customers\/(.+)$/)[1];
    const { data, error } = await adminClient.from("customers").update(parsed).eq("id", id).select().single();
    if (error || !data) return send(404, { error: "Customer not found." });
    return send(200, { customer: data });
  }
  if (method === "GET" && path === "/api/products") {
    if (!cp("product:read")) return;
    const [pr, cr] = await Promise.all([
      adminClient.from("products").select("*, category:product_categories(id,name)").order("created_at", { ascending: false }),
      adminClient.from("product_categories").select("*").order("name", { ascending: true })
    ]);
    if (pr.error) return send(500, { error: pr.error.message });
    return send(200, { products: pr.data || [], categories: cr.data || [] });
  }
  if (method === "POST" && path === "/api/products") {
    if (!cp("product:create")) return;
    const { data, error } = await adminClient.from("products").insert(withCreator(parsed)).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { product: data });
  }
  if (method === "PUT" && path.match(/^\/api\/products\/(.+)$/)) {
    if (!cp("product:update")) return;
    const id = path.match(/^\/api\/products\/(.+)$/)[1];
    const { data, error } = await adminClient.from("products").update(parsed).eq("id", id).select().single();
    if (error || !data) return send(404, { error: "Product not found." });
    return send(200, { product: data });
  }
  if (method === "GET" && path === "/api/product-brands") {
    if (!cp("product:read")) return;
    const { data, error } = await adminClient.from("product_brands").select("*").order("name", { ascending: true });
    if (error) return send(500, { error: error.message });
    return send(200, { brands: data || [] });
  }
  if (method === "GET" && path === "/api/product-units") {
    if (!cp("product:read")) return;
    const { data, error } = await adminClient.from("product_units").select("*").order("name", { ascending: true });
    if (error) return send(500, { error: error.message });
    return send(200, { units: data || [] });
  }
  if (method === "GET" && path === "/api/product-warehouses") {
    if (!cp("product:read")) return;
    const { data, error } = await adminClient.from("product_warehouses").select("*").order("name", { ascending: true });
    if (error) return send(500, { error: error.message });
    return send(200, { warehouses: data || [] });
  }
  if (method === "GET" && path === "/api/price-lists") {
    if (!cp("product:read")) return;
    const { data, error } = await adminClient.from("product_price_lists").select("*").order("name", { ascending: true });
    if (error) return send(500, { error: error.message });
    return send(200, { priceLists: data || [] });
  }
  if (method === "GET" && path.match(/^\/api\/products\/(.+)\/price-lists$/)) {
    if (!cp("product:read")) return;
    const id = path.match(/^\/api\/products\/(.+)\/price-lists$/)[1];
    const { data, error } = await adminClient.from("product_price_list_items").select("*, price_list:product_price_lists(name)").eq("product_id", id);
    if (error) return send(500, { error: error.message });
    return send(200, { items: data || [] });
  }
  if (method === "POST" && path.match(/^\/api\/products\/(.+)\/price-lists$/)) {
    if (!cp("product:update")) return;
    const id = path.match(/^\/api\/products\/(.+)\/price-lists$/)[1];
    const { error: delErr } = await adminClient.from("product_price_list_items").delete().eq("product_id", id);
    if (delErr) return send(500, { error: delErr.message });
    const rows = (parsed.items || []).map((r) => ({ ...r, product_id: id }));
    if (rows.length) {
      const { error: insErr } = await adminClient.from("product_price_list_items").insert(rows);
      if (insErr) return send(500, { error: insErr.message });
    }
    return send(200, { ok: true });
  }
  if (method === "GET" && path === "/api/banks") {
    if (!cp("invoice:read")) return;
    const { data, error } = await adminClient.from("banks").select("*").order("created_at", { ascending: false });
    if (error) return send(500, { error: error.message });
    return send(200, { banks: data || [] });
  }
  if (method === "POST" && path === "/api/banks") {
    if (!cp("invoice:create")) return;
    if (parsed.is_default) await adminClient.from("banks").update({ is_default: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    const { data, error } = await adminClient.from("banks").insert(withCreator(parsed)).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { bank: data });
  }
  if (method === "PUT" && path.match(/^\/api\/banks\/(.+)$/)) {
    if (!cp("invoice:update")) return;
    const id = path.match(/^\/api\/banks\/(.+)$/)[1];
    if (parsed.is_default) await adminClient.from("banks").update({ is_default: false }).neq("id", id);
    const { data, error } = await adminClient.from("banks").update(parsed).eq("id", id).select().single();
    if (error || !data) return send(404, { error: "Bank not found." });
    return send(200, { bank: data });
  }
  if (method === "DELETE" && path.match(/^\/api\/banks\/(.+)$/)) {
    if (!cp("invoice:delete")) return;
    const id = path.match(/^\/api\/banks\/(.+)$/)[1];
    const { error } = await adminClient.from("banks").delete().eq("id", id);
    if (error) return send(500, { error: error.message });
    return send(200, { ok: true });
  }
  if (method === "GET" && path === "/api/signatures") {
    if (!cp("invoice:read")) return;
    const { data, error } = await adminClient.from("signatures").select("*").order("created_at", { ascending: false });
    if (error) return send(500, { error: error.message });
    return send(200, { signatures: data || [] });
  }
  if (method === "POST" && path === "/api/signatures") {
    if (!cp("invoice:create")) return;
    if (parsed.is_default) await adminClient.from("signatures").update({ is_default: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    const { data, error } = await adminClient.from("signatures").insert(withCreator(parsed)).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { signature: data });
  }
  if (method === "DELETE" && path.match(/^\/api\/signatures\/(.+)$/)) {
    if (!cp("invoice:delete")) return;
    const id = path.match(/^\/api\/signatures\/(.+)$/)[1];
    const { error } = await adminClient.from("signatures").delete().eq("id", id);
    if (error) return send(500, { error: error.message });
    return send(200, { ok: true });
  }
  async function createAuditLog(tableName, recordId, action, oldValues, newValues, changedBy) {
    try {
      await adminClient.from("audit_logs").insert({
        id: crypto.randomUUID(),
        table_name: tableName,
        record_id: String(recordId),
        action,
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
        changed_by: changedBy || uid,
        ip_address: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch {
    }
  }
  async function createAccountingEntries(invoiceId, payload) {
    const entries = [];
    entries.push({ id: crypto.randomUUID(), invoice_id: invoiceId, entry_type: "debit", account_name: "Accounts Receivable", amount: payload.grand_total || 0, description: `Invoice ${payload.invoice_number}`, created_at: (/* @__PURE__ */ new Date()).toISOString() });
    entries.push({ id: crypto.randomUUID(), invoice_id: invoiceId, entry_type: "credit", account_name: "Sales Income", amount: payload.subtotal || 0, description: `Invoice ${payload.invoice_number} - Subtotal`, created_at: (/* @__PURE__ */ new Date()).toISOString() });
    if (payload.cgst_total > 0) {
      entries.push({ id: crypto.randomUUID(), invoice_id: invoiceId, entry_type: "credit", account_name: "CGST Payable", amount: payload.cgst_total, description: `Invoice ${payload.invoice_number}`, created_at: (/* @__PURE__ */ new Date()).toISOString() });
    }
    if (payload.sgst_total > 0) {
      entries.push({ id: crypto.randomUUID(), invoice_id: invoiceId, entry_type: "credit", account_name: "SGST Payable", amount: payload.sgst_total, description: `Invoice ${payload.invoice_number}`, created_at: (/* @__PURE__ */ new Date()).toISOString() });
    }
    if (payload.igst_total > 0) {
      entries.push({ id: crypto.randomUUID(), invoice_id: invoiceId, entry_type: "credit", account_name: "IGST Payable", amount: payload.igst_total, description: `Invoice ${payload.invoice_number}`, created_at: (/* @__PURE__ */ new Date()).toISOString() });
    }
    if (payload.additional_charges_total > 0) {
      entries.push({ id: crypto.randomUUID(), invoice_id: invoiceId, entry_type: "credit", account_name: "Other Charges", amount: payload.additional_charges_total, description: `Invoice ${payload.invoice_number}`, created_at: (/* @__PURE__ */ new Date()).toISOString() });
    }
    if (entries.length) await adminClient.from("accounting_entries").insert(entries);
  }
  async function deleteAccountingEntries(invoiceId) {
    await adminClient.from("accounting_entries").delete().eq("invoice_id", invoiceId);
  }
  async function updateProductStock(items, sign) {
    for (const item of items) {
      if (!item.product_id) continue;
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;
      await adminClient.rpc("exec_sql", {
        query_text: `UPDATE products SET stock_quantity = GREATEST(0, stock_quantity ${sign < 0 ? "-" : "+"} ${qty}) WHERE id = '${item.product_id}'`
      }).catch(() => {
      });
    }
  }
  async function updateCustomerBalance(customerId, deltaGrandTotal, deltaPaid) {
    if (!customerId) return;
    const g = Number(deltaGrandTotal) || 0;
    const p = Number(deltaPaid) || 0;
    const balDelta = g - p;
    if (balDelta === 0 && g === 0) return;
    await adminClient.rpc("exec_sql", {
      query_text: `UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance ${balDelta >= 0 ? "+" : "-"} ${Math.abs(balDelta)}), total_purchases = GREATEST(0, total_purchases ${g >= 0 ? "+" : "-"} ${Math.abs(g)}) WHERE id = '${customerId}'`
    }).catch(() => {
    });
  }
  function computeInvoiceStatus(invoice) {
    const total = Number(invoice.grand_total) || 0;
    const paid = Number(invoice.amount_paid) || 0;
    const due = invoice.due_date ? new Date(invoice.due_date) : null;
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    if (invoice.status === "cancelled" || invoice.status === "refunded" || invoice.status === "void") return invoice.status;
    if (paid >= total && total > 0) return "paid";
    if (paid > 0 && paid < total) return "partially_paid";
    if (invoice.status === "sent" && due && due < today) return "overdue";
    if (invoice.status === "pending" && due && due < today) return "overdue";
    if (invoice.status === "partially_paid" && due && due < today) return "overdue";
    return invoice.status || "draft";
  }
  if (method === "GET" && path === "/api/invoices/next-number") {
    if (!cp("invoice:read")) return;
    const prefix = parsed.prefix || "INV";
    const { data } = await adminClient.from("invoices").select("invoice_number").like("invoice_number", `${prefix}%`).order("invoice_number", { ascending: false }).limit(1);
    const next = nextInvoiceNumber(prefix, data?.[0]?.invoice_number);
    return send(200, { number: next });
  }
  if (method === "GET" && path === "/api/invoices") {
    if (!cp("invoice:read")) return;
    const { data, error } = await adminClient.from("invoices").select("*, customer:customers(id,name,company)").order("created_at", { ascending: false });
    if (error) return send(500, { error: error.message });
    return send(200, { invoices: data || [] });
  }
  if (method === "POST" && path === "/api/invoices") {
    if (!cp("invoice:create")) return;
    const { items, payments, ...invoiceRow } = parsed;
    const { data: dup } = await adminClient.from("invoices").select("id").eq("invoice_number", invoiceRow.invoice_number).limit(1);
    if (dup && dup.length) return send(409, { error: "Invoice number already exists." });
    const totalPaid = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    let status = invoiceRow.status || "draft";
    if (status !== "draft" && totalPaid > 0) {
      const total = Number(invoiceRow.grand_total) || 0;
      status = totalPaid >= total ? "paid" : "partially_paid";
    }
    invoiceRow.status = status;
    invoiceRow.amount_paid = totalPaid;
    invoiceRow.balance_due = Math.max(0, (Number(invoiceRow.grand_total) || 0) - totalPaid);
    const { data: inv, error: ie } = await adminClient.from("invoices").insert(withCreator(invoiceRow)).select().single();
    if (ie) return send(500, { error: ie.message });
    if (items?.length) await adminClient.from("invoice_items").insert(items.map((it, i) => ({ ...it, invoice_id: inv.id, sort_order: it.sort_order ?? i })));
    if (payments?.length) await adminClient.from("invoice_payments").insert(payments.map((p) => ({ ...p, invoice_id: inv.id, created_by: uid })));
    await Promise.all([
      updateProductStock(items || [], -1),
      updateCustomerBalance(invoiceRow.customer_id, invoiceRow.grand_total, totalPaid),
      createAccountingEntries(inv.id, invoiceRow),
      createAuditLog("invoices", inv.id, "created", null, invoiceRow, uid)
    ]);
    return send(201, { invoice: inv, status });
  }
  if (method === "GET" && path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)$/)) {
    if (!cp("invoice:read")) return;
    const id = path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)$/)[1];
    const [ir, items, pays] = await Promise.all([
      adminClient.from("invoices").select("*, customer:customers(*)").eq("id", id).single(),
      adminClient.from("invoice_items").select("*").eq("invoice_id", id).order("sort_order", { ascending: true }),
      adminClient.from("invoice_payments").select("*").eq("invoice_id", id).order("created_at", { ascending: true })
    ]);
    if (ir.error || !ir.data) return send(404, { error: "Invoice not found." });
    const invoice = { ...ir.data, items: items.data || [], payments: pays.data || [] };
    invoice.status = computeInvoiceStatus(invoice);
    return send(200, { invoice });
  }
  if (method === "PUT" && path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)$/)) {
    if (!cp("invoice:update")) return;
    const id = path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)$/)[1];
    const { items, payments, ...invoiceRow } = parsed;
    const { data: dup } = await adminClient.from("invoices").select("id").eq("invoice_number", invoiceRow.invoice_number).neq("id", id).limit(1);
    if (dup && dup.length) return send(409, { error: "Invoice number already exists." });
    const { data: oldInv } = await adminClient.from("invoices").select("*, items:invoice_items(*)").eq("id", id).single();
    if (!oldInv) return send(404, { error: "Invoice not found." });
    const oldItems = oldInv.items || [];
    const oldGrandTotal = Number(oldInv.grand_total) || 0;
    const oldAmountPaid = Number(oldInv.amount_paid) || 0;
    const totalPaid = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    let status = invoiceRow.status || oldInv.status || "draft";
    if (status !== "draft" && status !== "cancelled") {
      const total = Number(invoiceRow.grand_total) || 0;
      status = totalPaid >= total ? "paid" : totalPaid > 0 ? "partially_paid" : status;
    }
    invoiceRow.status = status;
    invoiceRow.amount_paid = totalPaid;
    invoiceRow.balance_due = Math.max(0, (Number(invoiceRow.grand_total) || 0) - totalPaid);
    const { data: inv, error: ie } = await adminClient.from("invoices").update(clean(invoiceRow)).eq("id", id).select().single();
    if (ie || !inv) return send(404, { error: "Invoice not found." });
    if (items) {
      await adminClient.from("invoice_items").delete().eq("invoice_id", id);
      if (items.length) await adminClient.from("invoice_items").insert(items.map((it, i) => ({ ...it, invoice_id: id, sort_order: it.sort_order ?? i })));
    }
    if (payments) {
      await adminClient.from("invoice_payments").delete().eq("invoice_id", id);
      if (payments.length) await adminClient.from("invoice_payments").insert(payments.map((p) => ({ ...p, invoice_id: id, created_by: p.created_by || uid })));
    }
    await Promise.all([
      updateProductStock(oldItems, 1),
      // restore old stock
      updateProductStock(items || [], -1),
      // reserve new stock
      updateCustomerBalance(invoiceRow.customer_id, invoiceRow.grand_total, totalPaid),
      deleteAccountingEntries(id),
      createAccountingEntries(id, invoiceRow),
      createAuditLog("invoices", id, "updated", oldInv, invoiceRow, uid)
    ]);
    return send(200, { invoice: inv, status });
  }
  if (method === "DELETE" && path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)$/)) {
    if (!cp("invoice:delete")) return;
    const id = path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)$/)[1];
    const { data: oldInv } = await adminClient.from("invoices").select("*, items:invoice_items(*)").eq("id", id).single();
    if (!oldInv) return send(404, { error: "Invoice not found." });
    if (oldInv.status === "paid") return send(409, { error: "Cannot delete a paid invoice. Cancel or refund instead." });
    if (oldInv.status === "refunded" || oldInv.status === "void") return send(409, { error: "Invoice already finalized." });
    const oldItems = oldInv.items || [];
    const { error } = await adminClient.from("invoices").update({ status: "cancelled", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id);
    if (error) return send(500, { error: error.message });
    await Promise.all([
      updateProductStock(oldItems, 1),
      updateCustomerBalance(oldInv.customer_id, -oldInv.grand_total, -oldInv.amount_paid),
      deleteAccountingEntries(id),
      createAuditLog("invoices", id, "cancelled", oldInv, { status: "cancelled" }, uid)
    ]);
    return send(200, { ok: true, status: "cancelled" });
  }
  if (method === "POST" && path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)\/duplicate$/)) {
    if (!cp("invoice:create")) return;
    const id = path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)\/duplicate$/)[1];
    const { data: original, error: fetchErr } = await adminClient.from("invoices").select("*, items:invoice_items(*)").eq("id", id).single();
    if (fetchErr || !original) return send(404, { error: "Invoice not found." });
    const { invoice_number: nextNum } = await getNextInvoiceNumber(adminClient, original.prefix || "INV-");
    const newInv = {
      prefix: original.prefix,
      invoice_number: nextNum,
      customer_id: original.customer_id,
      invoice_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      due_date: original.due_date,
      reference: original.reference,
      custom_headers: original.custom_headers,
      notes: original.notes,
      terms: original.terms,
      attachments: original.attachments,
      reverse_charge: original.reverse_charge,
      create_ewaybill: original.create_ewaybill,
      create_einvoice: original.create_einvoice,
      tds_enabled: original.tds_enabled,
      tcs_enabled: original.tcs_enabled,
      extra_discount_type: original.extra_discount_type,
      extra_discount_value: original.extra_discount_value,
      round_off: original.round_off,
      bank_id: original.bank_id,
      signature_id: original.signature_id,
      subtotal: original.subtotal,
      discount_total: original.discount_total,
      taxable_amount: original.taxable_amount,
      cgst_total: original.cgst_total,
      sgst_total: original.sgst_total,
      igst_total: original.igst_total,
      tax_total: original.tax_total,
      additional_charges_total: original.additional_charges_total,
      grand_total: original.grand_total,
      amount_paid: 0,
      balance_due: original.grand_total,
      status: "draft",
      created_by: uid
    };
    const { data: created, error: insertErr } = await adminClient.from("invoices").insert(newInv).select().single();
    if (insertErr) return send(500, { error: insertErr.message });
    if (original.items?.length) {
      const newItems = original.items.map((item) => ({
        invoice_id: created.id,
        product_id: item.product_id,
        name: item.name,
        description: item.description,
        show_description: item.show_description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        discount_type: item.discount_type,
        discount_value: item.discount_value,
        discount_amount: item.discount_amount,
        tax_amount: item.tax_amount,
        line_total: item.line_total,
        sort_order: item.sort_order
      }));
      const { error: itemsErr } = await adminClient.from("invoice_items").insert(newItems);
      if (itemsErr) return send(500, { error: itemsErr.message });
    }
    await createAuditLog("invoices", created.id, "created", null, newInv, uid);
    return send(201, { invoice: created });
  }
  const prefixToRow = (p) => ({
    value: p.value,
    description: p.description ?? null,
    doc_type: p.docType,
    is_active: p.isActive ?? true,
    is_default: p.isDefault ?? false,
    sequence_order: p.sequenceOrder ?? 1
  });
  const prefixToApi = (r) => ({
    id: r.id,
    value: r.value,
    description: r.description,
    docType: r.doc_type,
    isActive: r.is_active,
    isDefault: r.is_default,
    sequenceOrder: r.sequence_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  });
  if (path === "/api/prefix-settings" && method === "GET") {
    if (!cp("settings:read")) return;
    let q = adminClient.from("document_prefixes").select("*");
    if (parsed.docType) q = q.eq("doc_type", parsed.docType);
    const { data, error } = await q.order("sequence_order", { ascending: true });
    if (error) return send(500, { error: error.message });
    let items = (data || []).map(prefixToApi);
    if (parsed.active === "true") items = items.filter((p) => p.isActive !== false);
    if (parsed.default === "true") items = items.filter((p) => p.isDefault === true);
    if (parsed.q) {
      const search = parsed.q.toLowerCase();
      items = items.filter((p) => (p.value || "").toLowerCase().includes(search) || (p.description || "").toLowerCase().includes(search));
    }
    const sortField = parsed.sortField || "sequenceOrder";
    const sortDir = parsed.sortDir || "asc";
    items = [...items].sort((a, b) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      if (typeof va === "string") return sortDir === "desc" ? vb.localeCompare(va) : va.localeCompare(vb);
      return sortDir === "desc" ? vb - va : va - vb;
    });
    const pageSize = parseInt(parsed.pageSize, 10) || 10;
    const pageNum = parseInt(parsed.page, 10) || 1;
    const total = items.length;
    const paged = items.slice((pageNum - 1) * pageSize, pageNum * pageSize);
    return send(200, { items: paged, total });
  }
  if (path === "/api/prefix-settings" && method === "POST") {
    if (!cp("settings:update")) return;
    const row = { ...prefixToRow(parsed), id: crypto.randomUUID(), created_by: uid };
    if (row.is_default) {
      await adminClient.from("document_prefixes").update({ is_default: false }).eq("doc_type", row.doc_type).neq("id", row.id);
    }
    const { data, error } = await adminClient.from("document_prefixes").insert(row).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { prefix: prefixToApi(data) });
  }
  const psMatch2 = path.match(/^\/api\/prefix-settings\/([^/]+)$/);
  if (psMatch2) {
    const id = psMatch2[1];
    if (method === "PUT") {
      if (!cp("settings:update")) return;
      const updates = prefixToRow(parsed);
      if (updates.is_default) {
        await adminClient.from("document_prefixes").update({ is_default: false }).eq("doc_type", updates.doc_type).neq("id", id);
      }
      const { data, error } = await adminClient.from("document_prefixes").update(updates).eq("id", id).select().single();
      if (error || !data) return send(404, { error: "Prefix not found." });
      return send(200, { prefix: prefixToApi(data) });
    }
    if (method === "DELETE") {
      if (!cp("settings:delete")) return;
      const { error } = await adminClient.from("document_prefixes").delete().eq("id", id);
      if (error) return send(500, { error: error.message });
      return send(200, { ok: true });
    }
  }
  const psDefaultMatch2 = path.match(/^\/api\/prefix-settings\/([^/]+)\/default$/);
  if (psDefaultMatch2) {
    if (method === "POST") {
      if (!cp("settings:update")) return;
      const id = psDefaultMatch2[1];
      const { data: current } = await adminClient.from("document_prefixes").select("*").eq("id", id).single();
      if (!current) return send(404, { error: "Prefix not found." });
      await adminClient.from("document_prefixes").update({ is_default: false }).eq("doc_type", current.doc_type);
      const { data, error } = await adminClient.from("document_prefixes").update({ is_default: true }).eq("id", id).select().single();
      if (error || !data) return send(404, { error: "Prefix not found." });
      return send(200, { prefix: prefixToApi(data) });
    }
  }
  const suffixToRow = (p) => ({
    value: p.value,
    description: p.description ?? null,
    doc_type: p.docType,
    is_active: p.isActive ?? true,
    is_default: p.isDefault ?? false,
    sequence_order: p.sequenceOrder ?? 1
  });
  const suffixToApi = (r) => ({
    id: r.id,
    value: r.value,
    description: r.description,
    docType: r.doc_type,
    isActive: r.is_active,
    isDefault: r.is_default,
    sequenceOrder: r.sequence_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  });
  if (path === "/api/suffix-settings" && method === "GET") {
    if (!cp("settings:read")) return;
    let q = adminClient.from("document_suffixes").select("*");
    if (parsed.docType) q = q.eq("doc_type", parsed.docType);
    const { data, error } = await q.order("sequence_order", { ascending: true });
    if (error) return send(500, { error: error.message });
    let items = (data || []).map(suffixToApi);
    if (parsed.active === "true") items = items.filter((p) => p.isActive !== false);
    if (parsed.default === "true") items = items.filter((p) => p.isDefault === true);
    if (parsed.q) {
      const search = parsed.q.toLowerCase();
      items = items.filter((p) => (p.value || "").toLowerCase().includes(search) || (p.description || "").toLowerCase().includes(search));
    }
    const sortField = parsed.sortField || "sequenceOrder";
    const sortDir = parsed.sortDir || "asc";
    items = [...items].sort((a, b) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      if (typeof va === "string") return sortDir === "desc" ? vb.localeCompare(va) : va.localeCompare(vb);
      return sortDir === "desc" ? vb - va : va - vb;
    });
    const pageSize = parseInt(parsed.pageSize, 10) || 10;
    const pageNum = parseInt(parsed.page, 10) || 1;
    const total = items.length;
    const paged = items.slice((pageNum - 1) * pageSize, pageNum * pageSize);
    return send(200, { items: paged, total });
  }
  if (path === "/api/suffix-settings" && method === "POST") {
    if (!cp("settings:update")) return;
    const row = { ...suffixToRow(parsed), id: crypto.randomUUID(), created_by: uid };
    if (row.is_default) {
      await adminClient.from("document_suffixes").update({ is_default: false }).eq("doc_type", row.doc_type).neq("id", row.id);
    }
    const { data, error } = await adminClient.from("document_suffixes").insert(row).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { suffix: suffixToApi(data) });
  }
  const ssMatch2 = path.match(/^\/api\/suffix-settings\/([^/]+)$/);
  if (ssMatch2) {
    const id = ssMatch2[1];
    if (method === "PUT") {
      if (!cp("settings:update")) return;
      const updates = suffixToRow(parsed);
      if (updates.is_default) {
        await adminClient.from("document_suffixes").update({ is_default: false }).eq("doc_type", updates.doc_type).neq("id", id);
      }
      const { data, error } = await adminClient.from("document_suffixes").update(updates).eq("id", id).select().single();
      if (error || !data) return send(404, { error: "Suffix not found." });
      return send(200, { suffix: suffixToApi(data) });
    }
    if (method === "DELETE") {
      if (!cp("settings:delete")) return;
      const { error } = await adminClient.from("document_suffixes").delete().eq("id", id);
      if (error) return send(500, { error: error.message });
      return send(200, { ok: true });
    }
  }
  const ssDefaultMatch2 = path.match(/^\/api\/suffix-settings\/([^/]+)\/default$/);
  if (ssDefaultMatch2) {
    if (method === "POST") {
      if (!cp("settings:update")) return;
      const id = ssDefaultMatch2[1];
      const { data: current } = await adminClient.from("document_suffixes").select("*").eq("id", id).single();
      if (!current) return send(404, { error: "Suffix not found." });
      await adminClient.from("document_suffixes").update({ is_default: false }).eq("doc_type", current.doc_type);
      const { data, error } = await adminClient.from("document_suffixes").update({ is_default: true }).eq("id", id).select().single();
      if (error || !data) return send(404, { error: "Suffix not found." });
      return send(200, { suffix: suffixToApi(data) });
    }
  }
  const noteToRow = (n) => ({
    doc_type: n.docType ?? null,
    title: n.title ?? null,
    content: n.text !== void 0 ? n.text : n.content ?? null
  });
  const noteToApi = (r) => ({
    id: r.id,
    docType: r.doc_type,
    title: r.title,
    content: r.content,
    text: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  });
  if (path === "/api/document-notes" && method === "GET") {
    if (!cp("settings:read")) return;
    let q = adminClient.from("document_notes").select("*");
    if (parsed.docType) q = q.eq("doc_type", parsed.docType);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) return send(500, { error: error.message });
    let items = (data || []).map(noteToApi);
    if (parsed.q) {
      const search = parsed.q.toLowerCase();
      items = items.filter((n) => (n.content || "").toLowerCase().includes(search) || (n.title || "").toLowerCase().includes(search));
    }
    const sortField = parsed.sortField || "createdAt";
    const sortDir = parsed.sortDir || "desc";
    items = [...items].sort((a, b) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      if (typeof va === "string") return sortDir === "desc" ? vb.localeCompare(va) : va.localeCompare(vb);
      return sortDir === "desc" ? vb - va : va - vb;
    });
    const pageSize = parseInt(parsed.pageSize, 10) || 10;
    const pageNum = parseInt(parsed.page, 10) || 1;
    const total = items.length;
    const paged = items.slice((pageNum - 1) * pageSize, pageNum * pageSize);
    return send(200, { items: paged, total });
  }
  if (path === "/api/document-notes" && method === "POST") {
    if (!cp("settings:update")) return;
    const { data, error } = await adminClient.from("document_notes").insert({ ...noteToRow(parsed), id: crypto.randomUUID(), created_by: uid }).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { note: noteToApi(data) });
  }
  const noteMatch2 = path.match(/^\/api\/document-notes\/([^/]+)$/);
  if (noteMatch2) {
    const id = noteMatch2[1];
    if (method === "PUT") {
      if (!cp("settings:update")) return;
      const { data, error } = await adminClient.from("document_notes").update(noteToRow(parsed)).eq("id", id).select().single();
      if (error || !data) return send(404, { error: "Note not found." });
      return send(200, { note: noteToApi(data) });
    }
    if (method === "DELETE") {
      if (!cp("settings:delete")) return;
      const { error } = await adminClient.from("document_notes").delete().eq("id", id);
      if (error) return send(500, { error: error.message });
      return send(200, { ok: true });
    }
  }
  const termToRow = (t) => ({
    doc_type: t.docType ?? null,
    title: t.title ?? null,
    content: t.text !== void 0 ? t.text : t.content ?? null
  });
  const termToApi = (r) => ({
    id: r.id,
    docType: r.doc_type,
    title: r.title,
    content: r.content,
    text: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  });
  if (path === "/api/document-terms" && method === "GET") {
    if (!cp("settings:read")) return;
    let q = adminClient.from("document_terms").select("*");
    if (parsed.docType) q = q.eq("doc_type", parsed.docType);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) return send(500, { error: error.message });
    let items = (data || []).map(termToApi);
    if (parsed.q) {
      const search = parsed.q.toLowerCase();
      items = items.filter((t) => (t.content || "").toLowerCase().includes(search) || (t.title || "").toLowerCase().includes(search));
    }
    const sortField = parsed.sortField || "createdAt";
    const sortDir = parsed.sortDir || "desc";
    items = [...items].sort((a, b) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      if (typeof va === "string") return sortDir === "desc" ? vb.localeCompare(va) : va.localeCompare(vb);
      return sortDir === "desc" ? vb - va : va - vb;
    });
    const pageSize = parseInt(parsed.pageSize, 10) || 10;
    const pageNum = parseInt(parsed.page, 10) || 1;
    const total = items.length;
    const paged = items.slice((pageNum - 1) * pageSize, pageNum * pageSize);
    return send(200, { items: paged, total });
  }
  if (path === "/api/document-terms" && method === "POST") {
    if (!cp("settings:update")) return;
    const { data, error } = await adminClient.from("document_terms").insert({ ...termToRow(parsed), id: crypto.randomUUID(), created_by: uid }).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { term: termToApi(data) });
  }
  const termMatch2 = path.match(/^\/api\/document-terms\/([^/]+)$/);
  if (termMatch2) {
    const id = termMatch2[1];
    if (method === "PUT") {
      if (!cp("settings:update")) return;
      const { data, error } = await adminClient.from("document_terms").update(termToRow(parsed)).eq("id", id).select().single();
      if (error || !data) return send(404, { error: "Term not found." });
      return send(200, { term: termToApi(data) });
    }
    if (method === "DELETE") {
      if (!cp("settings:delete")) return;
      const { error } = await adminClient.from("document_terms").delete().eq("id", id);
      if (error) return send(500, { error: error.message });
      return send(200, { ok: true });
    }
  }
  const columnToApi = (c) => ({
    id: c.id,
    key: c.key,
    label: c.label,
    always: c.always,
    defaultVisible: c.default_visible,
    width: c.width,
    permission: c.permission,
    displayOrder: c.display_order
  });
  if (path === "/api/product-columns" && method === "GET") {
    const { data, error } = await adminClient.from("invoice_table_columns").select("*").order("display_order", { ascending: true });
    if (error) return send(500, { error: error.message });
    return send(200, { columns: (data || []).map(columnToApi) });
  }
  if (path === "/api/product-columns" && method === "PUT") {
    if (!cp("settings:update")) return;
    const columns = parsed.columns || [];
    const { error: delErr } = await adminClient.from("invoice_table_columns").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr) return send(500, { error: delErr.message });
    if (columns.length) {
      const rows = columns.map((c) => ({
        id: c.id || crypto.randomUUID(),
        key: c.key,
        label: c.label,
        always: c.always ?? false,
        default_visible: c.defaultVisible ?? false,
        width: c.width ?? null,
        permission: c.permission ?? null,
        display_order: c.displayOrder ?? 1,
        created_by: uid
      }));
      const { error: insErr } = await adminClient.from("invoice_table_columns").insert(rows);
      if (insErr) return send(500, { error: insErr.message });
    }
    return send(200, { ok: true });
  }
  return send(404, { error: "Not found." });
}
function nextInvoiceNumber(prefix, lastNumber) {
  const PAD = 4;
  let seq = 1;
  if (lastNumber) {
    const tail = String(lastNumber).replace(prefix, "");
    const n = parseInt(tail.replace(/\D/g, ""), 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(PAD, "0")}`;
}
async function adminSupabase() {
  if (_adminSupabase) return _adminSupabase;
  const { createClient } = await import("file:///H:/code/CoreX/node_modules/@supabase/supabase-js/dist/index.mjs");
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
import { defineConfig } from "file:///H:/code/CoreX/node_modules/vite/dist/node/index.js";
import react from "file:///H:/code/CoreX/node_modules/@vitejs/plugin-react/dist/index.js";

// server/plugin.js
import { loadEnv } from "file:///H:/code/CoreX/node_modules/vite/dist/node/index.js";
var db = null;
async function ensureDb(mode) {
  if (db) return db;
  const viteEnv = loadEnv(mode, process.cwd(), "VITE_");
  const serverEnv = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, viteEnv, serverEnv);
  if (viteEnv.VITE_SUPABASE_URL && viteEnv.VITE_SUPABASE_ANON_KEY) {
    const { initDatabase: initDatabase2 } = await Promise.resolve().then(() => (init_data(), data_exports));
    db = await initDatabase2(viteEnv.VITE_DATABASE_PROVIDER || "supabase", {
      url: viteEnv.VITE_SUPABASE_URL,
      anonKey: viteEnv.VITE_SUPABASE_ANON_KEY
    });
  } else {
    const memoryStore = /* @__PURE__ */ new Map();
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
        }
      }
    };
  }
  return db;
}
function apiPlugin() {
  return {
    name: "corex-api",
    configureServer(server) {
      server.middlewares.use(async (req2, res, next) => {
        if (req2.url.startsWith("/api/")) {
          const dbase = await ensureDb(server.config.mode);
          const { handleApiRequest: handleApiRequest2 } = await Promise.resolve().then(() => (init_api(), api_exports));
          handleApiRequest2(req2, res, dbase);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbmZpZy9pbmRleC5qcyIsICJzcmMvZGF0YS9wcm92aWRlcnMvaW5kZXguanMiLCAic3JjL2RhdGEvc3FsUGFyYW1zLmpzIiwgInNyYy9pZGVudGl0eS9hdXRoL3N1cGFiYXNlQ2xpZW50LmpzIiwgInNyYy9kYXRhL3Byb3ZpZGVycy9TdXBhYmFzZVByb3ZpZGVyLmpzIiwgInNyYy9kYXRhL2luZGV4LmpzIiwgInNyYy9hdWRpdC9BdWRpdFNlcnZpY2UuanMiLCAic3JjL2NvbmZpZy9zZXJ2ZXJTZWNyZXRzLmpzIiwgInNlcnZlci9hcGkuanMiLCAidml0ZS5jb25maWcuanMiLCAic2VydmVyL3BsdWdpbi5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkg6XFxcXGNvZGVcXFxcQ29yZVhcXFxcc3JjXFxcXGNvbmZpZ1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiSDpcXFxcY29kZVxcXFxDb3JlWFxcXFxzcmNcXFxcY29uZmlnXFxcXGluZGV4LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9IOi9jb2RlL0NvcmVYL3NyYy9jb25maWcvaW5kZXguanNcIjtleHBvcnQgY29uc3QgY29uZmlnID0gT2JqZWN0LmZyZWV6ZSh7XG4gIGdldCBhdXRoUHJvdmlkZXIoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBpbXBvcnQubWV0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgaW1wb3J0Lm1ldGEuZW52XG4gICAgICA/IGltcG9ydC5tZXRhLmVudi5WSVRFX0FVVEhfUFJPVklERVJcbiAgICAgIDogdHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHByb2Nlc3MuZW52XG4gICAgICAgID8gcHJvY2Vzcy5lbnYuVklURV9BVVRIX1BST1ZJREVSXG4gICAgICAgIDogdW5kZWZpbmVkO1xuICB9LFxuICBnZXQgZGF0YWJhc2VQcm92aWRlcigpIHtcbiAgICByZXR1cm4gdHlwZW9mIGltcG9ydC5tZXRhICE9PSAndW5kZWZpbmVkJyAmJiBpbXBvcnQubWV0YS5lbnZcbiAgICAgID8gaW1wb3J0Lm1ldGEuZW52LlZJVEVfREFUQUJBU0VfUFJPVklERVJcbiAgICAgIDogdHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHByb2Nlc3MuZW52XG4gICAgICAgID8gcHJvY2Vzcy5lbnYuVklURV9EQVRBQkFTRV9QUk9WSURFUlxuICAgICAgICA6IHVuZGVmaW5lZDtcbiAgfSxcbiAgZ2V0IHN0b3JhZ2VQcm92aWRlcigpIHtcbiAgICByZXR1cm4gdHlwZW9mIGltcG9ydC5tZXRhICE9PSAndW5kZWZpbmVkJyAmJiBpbXBvcnQubWV0YS5lbnZcbiAgICAgID8gaW1wb3J0Lm1ldGEuZW52LlZJVEVfU1RPUkFHRV9QUk9WSURFUlxuICAgICAgOiB0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvY2Vzcy5lbnZcbiAgICAgICAgPyBwcm9jZXNzLmVudi5WSVRFX1NUT1JBR0VfUFJPVklERVJcbiAgICAgICAgOiB1bmRlZmluZWQ7XG4gIH0sXG4gIGdldCBzdG9yYWdlUm9vdEZvbGRlcigpIHtcbiAgICByZXR1cm4gdHlwZW9mIGltcG9ydC5tZXRhICE9PSAndW5kZWZpbmVkJyAmJiBpbXBvcnQubWV0YS5lbnZcbiAgICAgID8gaW1wb3J0Lm1ldGEuZW52LlZJVEVfU1RPUkFHRV9ST09UX0ZPTERFUlxuICAgICAgOiB0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvY2Vzcy5lbnZcbiAgICAgICAgPyBwcm9jZXNzLmVudi5WSVRFX1NUT1JBR0VfUk9PVF9GT0xERVJcbiAgICAgICAgOiB1bmRlZmluZWQ7XG4gIH0sXG4gIGdldCBzdXBhYmFzZVVybCgpIHtcbiAgICByZXR1cm4gdHlwZW9mIGltcG9ydC5tZXRhICE9PSAndW5kZWZpbmVkJyAmJiBpbXBvcnQubWV0YS5lbnZcbiAgICAgID8gaW1wb3J0Lm1ldGEuZW52LlZJVEVfU1VQQUJBU0VfVVJMXG4gICAgICA6IHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiBwcm9jZXNzLmVudlxuICAgICAgICA/IHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfVVJMXG4gICAgICAgIDogdW5kZWZpbmVkO1xuICB9LFxuICBnZXQgc3VwYWJhc2VBbm9uS2V5KCkge1xuICAgIHJldHVybiB0eXBlb2YgaW1wb3J0Lm1ldGEgIT09ICd1bmRlZmluZWQnICYmIGltcG9ydC5tZXRhLmVudlxuICAgICAgPyBpbXBvcnQubWV0YS5lbnYuVklURV9TVVBBQkFTRV9BTk9OX0tFWVxuICAgICAgOiB0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvY2Vzcy5lbnZcbiAgICAgICAgPyBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX0FOT05fS0VZXG4gICAgICAgIDogdW5kZWZpbmVkO1xuICB9LFxuICAvLyBTRUNVUklUWTogVGhlIFN1cGFiYXNlIHNlcnZpY2Ugcm9sZSBrZXkgaXMgYSBGVUxMLUFETUlOIHNlY3JldCB0aGF0XG4gIC8vIGJ5cGFzc2VzIFJvdyBMZXZlbCBTZWN1cml0eSBhbmQgbXVzdCBORVZFUiBiZSBleHBvc2VkIHRvIHRoZSBicm93c2VyLlxuICAvLyBUaGVyZSBpcyBpbnRlbnRpb25hbGx5IE5PIGBzdXBhYmFzZVNlcnZpY2VSb2xlS2V5YCBnZXR0ZXIgb24gdGhpc1xuICAvLyBjbGllbnQtZmFjaW5nIGNvbmZpZyBvYmplY3QuIFByZXZpb3VzbHkgdGhpcyBnZXR0ZXIgcmVhZFxuICAvLyBgaW1wb3J0Lm1ldGEuZW52LlZJVEVfU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWWAsIHdoaWNoIGNhdXNlZCBWaXRlIHRvXG4gIC8vIGlubGluZSB0aGUgdmFsdWUgaW50byB0aGUgY2xpZW50IGJ1bmRsZSB3aGVuZXZlciBpdCB3YXMgc2V0IFx1MjAxNCBsZWFraW5nIGFcbiAgLy8gZnVsbC1hZG1pbiBjcmVkZW50aWFsIHRvIGV2ZXJ5IHZpc2l0b3IuIFRoZSBzZXJ2aWNlIHJvbGUga2V5IGlzIG5vdyBvbmx5XG4gIC8vIGV2ZXIgcmVhZCBmcm9tIGBwcm9jZXNzLmVudmAgb24gdGhlIHNlcnZlciAoc2VlXG4gIC8vIGBzcmMvY29uZmlnL3NlcnZlclNlY3JldHMuanNgKS4gRG8gbm90IHJlLWFkZCBhIGdldHRlciBoZXJlIHRoYXRcbiAgLy8gcmVmZXJlbmNlcyBgaW1wb3J0Lm1ldGEuZW52YCBmb3IgdGhpcyBrZXkuXG4gIGdldCBzdXBhYmFzZUJ1Y2tldCgpIHtcbiAgICByZXR1cm4gdHlwZW9mIGltcG9ydC5tZXRhICE9PSAndW5kZWZpbmVkJyAmJiBpbXBvcnQubWV0YS5lbnZcbiAgICAgID8gaW1wb3J0Lm1ldGEuZW52LlZJVEVfU1VQQUJBU0VfQlVDS0VUXG4gICAgICA6IHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiBwcm9jZXNzLmVudlxuICAgICAgICA/IHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfQlVDS0VUXG4gICAgICAgIDogdW5kZWZpbmVkO1xuICB9LFxuICBnZXQgYXBwVXJsKCkge1xuICAgIGNvbnN0IGVudlVybCA9ICh0eXBlb2YgaW1wb3J0Lm1ldGEgIT09ICd1bmRlZmluZWQnICYmIGltcG9ydC5tZXRhLmVudlxuICAgICAgPyBpbXBvcnQubWV0YS5lbnYuVklURV9BUFBfVVJMXG4gICAgICA6IHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiBwcm9jZXNzLmVudlxuICAgICAgICA/IHByb2Nlc3MuZW52LlZJVEVfQVBQX1VSTFxuICAgICAgICA6IHVuZGVmaW5lZCk7XG5cbiAgICBjb25zdCBoYXNXaW5kb3cgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cubG9jYXRpb24gJiYgd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcbiAgICBjb25zdCBhY3R1YWxPcmlnaW4gPSBoYXNXaW5kb3cgPyB3aW5kb3cubG9jYXRpb24ub3JpZ2luIDogbnVsbDtcblxuICAgIC8vIFRoZSByZWRpcmVjdCBVUkwgZm9yIGF1dGggZW1haWxzIE1VU1QgcG9pbnQgYXQgd2hlcmUgdGhlIGFwcCBpcyBBQ1RVQUxMWVxuICAgIC8vIHJ1bm5pbmcgXHUyMDE0IHRoYXQgaXMgd2hlcmUgdGhlIHVzZXIncyBicm93c2VyIGlzIHJpZ2h0IG5vdywgYW5kIHRoYXQgaXMgd2hlcmVcbiAgICAvLyB0aGUgY29uZmlybWF0aW9uIGxpbmsgaGFzIHRvIGJyaW5nIHRoZW0gYmFjayB0by4gQSBjb21tb24gcHJvZHVjdGlvbiBidWdcbiAgICAvLyBpcyBzaGlwcGluZyB3aXRoIFZJVEVfQVBQX1VSTCBzdGlsbCBzZXQgdG8gaHR0cDovL2xvY2FsaG9zdDozMDAwIChjb3BpZWRcbiAgICAvLyBmcm9tIC5lbnYuZXhhbXBsZSk7IGlmIHdlIHByZWZlcnJlZCBlbnZVcmwgdW5jb25kaXRpb25hbGx5LCB0aGVcbiAgICAvLyBjb25maXJtYXRpb24gZW1haWwgd291bGQgcmVkaXJlY3QgdXNlcnMgdG8gbG9jYWxob3N0IGluIHByb2R1Y3Rpb24gYW5kXG4gICAgLy8gYnJlYWsgdGhlIGZsb3cuIFNvOlxuICAgIC8vICAgLSBJZiBhIGJyb3dzZXIgb3JpZ2luIGlzIGF2YWlsYWJsZSwgaXQgaXMgdGhlIGdyb3VuZCB0cnV0aC4gV2Ugb25seVxuICAgIC8vICAgICBwcmVmZXIgYSBjb25maWd1cmVkIGVudlVybCB3aGVuIGl0IGlzIGNvbnNpc3RlbnQgd2l0aCAoYSBwcmVmaXggb2YpXG4gICAgLy8gICAgIHRoZSByZWFsIG9yaWdpbiwgT1Igd2hlbiB0aGVyZSBpcyBubyBicm93c2VyIHRvIGNvbXBhcmUgYWdhaW5zdC5cbiAgICAvLyAgIC0gQSBsb2NhbGhvc3QgZW52VXJsIGlzIG5ldmVyIHRydXN0ZWQgb3V0c2lkZSBhbiBhY3R1YWwgbG9jYWxob3N0XG4gICAgLy8gICAgIG9yaWdpbiwgd2hpY2gga2lsbHMgdGhlIFwicmVkaXJlY3RzIHRvIGxvY2FsaG9zdCBpbiBwcm9kdWN0aW9uXCIgZGVmZWN0XG4gICAgLy8gICAgIGF0IHRoZSByb290LCByZWdhcmRsZXNzIG9mIGhvdyAuZW52IGlzIGNvbmZpZ3VyZWQuXG4gICAgaWYgKGFjdHVhbE9yaWdpbikge1xuICAgICAgY29uc3Qgbm9ybWFsaXplZEVudiA9IGVudlVybCA/IFN0cmluZyhlbnZVcmwpLnJlcGxhY2UoL1xcLyQvLCAnJykgOiBudWxsO1xuICAgICAgY29uc3QgZW52SXNDb25zaXN0ZW50ID0gISFub3JtYWxpemVkRW52ICYmIGFjdHVhbE9yaWdpbi5zdGFydHNXaXRoKG5vcm1hbGl6ZWRFbnYpO1xuICAgICAgY29uc3QgZW52SXNMb2NhbGhvc3QgPSAhIW5vcm1hbGl6ZWRFbnYgJiYgL15odHRwcz86XFwvXFwvKGxvY2FsaG9zdHwxMjdcXC4wXFwuMFxcLjEpKFs6L118JCkvLnRlc3Qobm9ybWFsaXplZEVudik7XG4gICAgICBjb25zdCBhY3R1YWxJc0xvY2FsaG9zdCA9IC9eaHR0cHM/OlxcL1xcLyhsb2NhbGhvc3R8MTI3XFwuMFxcLjBcXC4xKShbOi9dfCQpLy50ZXN0KGFjdHVhbE9yaWdpbik7XG4gICAgICBpZiAoZW52SXNDb25zaXN0ZW50KSByZXR1cm4gbm9ybWFsaXplZEVudjtcbiAgICAgIC8vIGVudiBkaXNhZ3JlZXMgd2l0aCB0aGUgcmVhbCBvcmlnaW4sIE9SIGVudiBpcyBsb2NhbGhvc3Qgd2hpbGUgYWN0dWFsbHlcbiAgICAgIC8vIGRlcGxveWVkIFx1MjE5MiB1c2UgdGhlIHJlYWwgb3JpZ2luLiBUaGlzIGlzIHRoZSBwcm9kdWN0aW9uLXNhZmUgY2hvaWNlIGFuZFxuICAgICAgLy8ga2lsbHMgdGhlIFwicmVkaXJlY3RzIHRvIGxvY2FsaG9zdCBpbiBwcm9kdWN0aW9uXCIgZGVmZWN0IGF0IHRoZSByb290LlxuICAgICAgaWYgKCFlbnZJc0xvY2FsaG9zdCB8fCBhY3R1YWxJc0xvY2FsaG9zdCkgcmV0dXJuIGFjdHVhbE9yaWdpbjtcbiAgICAgIHJldHVybiBhY3R1YWxPcmlnaW47XG4gICAgfVxuXG4gICAgLy8gTm8gYnJvd3NlciAoU1NSIC8gTm9kZSAvIHRlc3RzKSBcdTIwMTQgZmFsbCBiYWNrIHRvIGVudiwgdGhlbiBhIHNhbmUgZGVmYXVsdC5cbiAgICByZXR1cm4gZW52VXJsIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnO1xuICB9LFxufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1N1cGFiYXNlRW5hYmxlZCgpIHtcbiAgcmV0dXJuICEhKGNvbmZpZy5zdXBhYmFzZVVybCAmJiBjb25maWcuc3VwYWJhc2VBbm9uS2V5KTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiSDpcXFxcY29kZVxcXFxDb3JlWFxcXFxzcmNcXFxcZGF0YVxcXFxwcm92aWRlcnNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkg6XFxcXGNvZGVcXFxcQ29yZVhcXFxcc3JjXFxcXGRhdGFcXFxccHJvdmlkZXJzXFxcXGluZGV4LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9IOi9jb2RlL0NvcmVYL3NyYy9kYXRhL3Byb3ZpZGVycy9pbmRleC5qc1wiO2V4cG9ydCBjbGFzcyBEYXRhYmFzZVByb3ZpZGVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uID0gbnVsbDtcbiAgICB0aGlzLnR5cGUgPSBudWxsO1xuICB9XG5cbiAgYXN5bmMgY29ubmVjdChfY29uZmlnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjb25uZWN0KCkgbXVzdCBiZSBpbXBsZW1lbnRlZCBieSBwcm92aWRlciBzdWJjbGFzcy4nKTtcbiAgfVxuXG4gIGFzeW5jIHF1ZXJ5KF9zcWwsIF9wYXJhbXMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3F1ZXJ5KCkgbXVzdCBiZSBpbXBsZW1lbnRlZCBieSBwcm92aWRlciBzdWJjbGFzcy4nKTtcbiAgfVxuXG4gIGFzeW5jIGRpc2Nvbm5lY3QoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdkaXNjb25uZWN0KCkgbXVzdCBiZSBpbXBsZW1lbnRlZCBieSBwcm92aWRlciBzdWJjbGFzcy4nKTtcbiAgfVxufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJIOlxcXFxjb2RlXFxcXENvcmVYXFxcXHNyY1xcXFxkYXRhXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJIOlxcXFxjb2RlXFxcXENvcmVYXFxcXHNyY1xcXFxkYXRhXFxcXHNxbFBhcmFtcy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vSDovY29kZS9Db3JlWC9zcmMvZGF0YS9zcWxQYXJhbXMuanNcIjsvLyBIZWxwZXJzIGZvciBzZXJpYWxpemluZyBKUyB2YWx1ZXMgaW50byBTUUwgbGl0ZXJhbHMgYW5kIGlubGluaW5nIGAkMSwgJDIsIC4uLmBcbi8vIHBsYWNlaG9sZGVycyBpbnRvIGEgcXVlcnkgc3RyaW5nLiBVc2VkIHdoZXJlIGEgc2luZ2xlLXRleHQgU1FMIGFyZ3VtZW50IG11c3Rcbi8vIGNhcnJ5IGJvdW5kIHBhcmFtZXRlcnMgKGUuZy4gdGhlIGBleGVjX3NxbChxdWVyeV90ZXh0IHRleHQpYCBTRUNVUklUWSBERUZJTkVSXG4vLyBSUEMsIHdoaWNoIGNhbm5vdCBhY2NlcHQgc2VwYXJhdGUgYmluZCBwYXJhbXMgdGhyb3VnaCBQb3N0Z1JFU1QpLlxuXG5leHBvcnQgZnVuY3Rpb24gc3FsTGl0ZXJhbCh2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuICdOVUxMJztcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSByZXR1cm4gdmFsdWUgPyAnVFJVRScgOiAnRkFMU0UnO1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykgcmV0dXJuIE51bWJlci5pc0Zpbml0ZSh2YWx1ZSkgPyBTdHJpbmcodmFsdWUpIDogJ05VTEwnO1xuICAvLyBzdHJpbmcgXHUyMDE0IGVzY2FwZSBzaW5nbGUgcXVvdGVzIHBlciBTUUwgc3RhbmRhcmQgKGRvdWJsZWQpIGFuZCB3cmFwIGluIHF1b3Rlcy5cbiAgcmV0dXJuIGAnJHtTdHJpbmcodmFsdWUpLnJlcGxhY2UoLycvZywgXCInJ1wiKX0nYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJpbmRJbmxpbmUoc3FsLCBwYXJhbXMpIHtcbiAgaWYgKCFwYXJhbXMgfHwgcGFyYW1zLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHNxbDtcbiAgbGV0IG91dCA9ICcnO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHNxbC5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbnN0IGNoID0gc3FsW2ldO1xuICAgIGlmIChjaCA9PT0gJyQnICYmIC9bMS05XS8udGVzdChzcWxbaSArIDFdIHx8ICcnKSkge1xuICAgICAgLy8gQ29uc3VtZSB0aGUgZnVsbCBydW4gb2YgZGlnaXRzIHRvIHN1cHBvcnQgJDEuLiQ5IChhbmQgYmV5b25kIGlmIGV2ZXIgdXNlZCkuXG4gICAgICBsZXQgbnVtID0gJyc7XG4gICAgICBsZXQgaiA9IGkgKyAxO1xuICAgICAgd2hpbGUgKGogPCBzcWwubGVuZ3RoICYmIC9bMC05XS8udGVzdChzcWxbal0pKSB7IG51bSArPSBzcWxbal07IGogKz0gMTsgfVxuICAgICAgY29uc3QgcG9zID0gcGFyc2VJbnQobnVtLCAxMCkgLSAxO1xuICAgICAgaWYgKHBvcyA+PSAwICYmIHBvcyA8IHBhcmFtcy5sZW5ndGgpIHtcbiAgICAgICAgb3V0ICs9IHNxbExpdGVyYWwocGFyYW1zW3Bvc10pO1xuICAgICAgICBpID0gaiAtIDE7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cbiAgICBvdXQgKz0gY2g7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiSDpcXFxcY29kZVxcXFxDb3JlWFxcXFxzcmNcXFxcaWRlbnRpdHlcXFxcYXV0aFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiSDpcXFxcY29kZVxcXFxDb3JlWFxcXFxzcmNcXFxcaWRlbnRpdHlcXFxcYXV0aFxcXFxzdXBhYmFzZUNsaWVudC5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vSDovY29kZS9Db3JlWC9zcmMvaWRlbnRpdHkvYXV0aC9zdXBhYmFzZUNsaWVudC5qc1wiO2ltcG9ydCB7IGNvbmZpZyB9IGZyb20gJy4uLy4uL2NvbmZpZy9pbmRleC5qcyc7XG5cbmxldCBjbGllbnQgPSBudWxsO1xubGV0IGNsaWVudFByb21pc2UgPSBudWxsO1xuXG5mdW5jdGlvbiBnZXRTdG9yZWQoa2V5KSB7XG4gIHRyeSB7IHJldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpOyB9IGNhdGNoIHsgcmV0dXJuIG51bGw7IH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFN1cGFiYXNlQ2xpZW50KCkge1xuICBpZiAoY2xpZW50KSByZXR1cm4gY2xpZW50O1xuICBpZiAoY2xpZW50UHJvbWlzZSkgcmV0dXJuIGNsaWVudFByb21pc2U7XG5cbiAgY29uc3Qgc3VwYWJhc2VVcmwgPSBjb25maWcuc3VwYWJhc2VVcmwgfHwgZ2V0U3RvcmVkKCdzdXBhYmFzZV91cmwnKTtcbiAgY29uc3Qgc3VwYWJhc2VBbm9uS2V5ID0gY29uZmlnLnN1cGFiYXNlQW5vbktleSB8fCBnZXRTdG9yZWQoJ3N1cGFiYXNlX2Fub25fa2V5Jyk7XG5cbiAgaWYgKCFzdXBhYmFzZVVybCB8fCAhc3VwYWJhc2VBbm9uS2V5KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdTdXBhYmFzZSBpcyBub3QgY29uZmlndXJlZC4gU2V0IFZJVEVfU1VQQUJBU0VfVVJMIGFuZCBWSVRFX1NVUEFCQVNFX0FOT05fS0VZLicpO1xuICB9XG4gIGNsaWVudFByb21pc2UgPSAoYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHsgY3JlYXRlQ2xpZW50IH0gPSBhd2FpdCBpbXBvcnQoJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcycpO1xuICAgIGNsaWVudCA9IGNyZWF0ZUNsaWVudChzdXBhYmFzZVVybCwgc3VwYWJhc2VBbm9uS2V5KTtcbiAgICByZXR1cm4gY2xpZW50O1xuICB9KSgpO1xuICByZXR1cm4gY2xpZW50UHJvbWlzZTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiSDpcXFxcY29kZVxcXFxDb3JlWFxcXFxzcmNcXFxcZGF0YVxcXFxwcm92aWRlcnNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkg6XFxcXGNvZGVcXFxcQ29yZVhcXFxcc3JjXFxcXGRhdGFcXFxccHJvdmlkZXJzXFxcXFN1cGFiYXNlUHJvdmlkZXIuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0g6L2NvZGUvQ29yZVgvc3JjL2RhdGEvcHJvdmlkZXJzL1N1cGFiYXNlUHJvdmlkZXIuanNcIjtpbXBvcnQgeyBEYXRhYmFzZVByb3ZpZGVyIH0gZnJvbSAnLi9pbmRleC5qcyc7XG5pbXBvcnQgeyBiaW5kSW5saW5lIH0gZnJvbSAnLi4vc3FsUGFyYW1zLmpzJztcbmltcG9ydCB7IGdldFN1cGFiYXNlQ2xpZW50IH0gZnJvbSAnLi4vLi4vaWRlbnRpdHkvYXV0aC9zdXBhYmFzZUNsaWVudC5qcyc7XG5cbmNvbnN0IEVYRUNfU1FMX05PVF9JTlNUQUxMRURfSElOVCA9XG4gIFwiVGhlICdleGVjX3NxbCcgaGVscGVyIGZ1bmN0aW9uIGlzIG5vdCBpbnN0YWxsZWQgaW4gdGhpcyBkYXRhYmFzZS4gXCIgK1xuICAnUnVuIHRoZSBnZW5lcmF0ZWQgc2NoZW1hIFNRTCBpbiB0aGUgU3VwYWJhc2UgU1FMIEVkaXRvciwgdGhlbiB0cnkgYWdhaW4uJztcblxuZXhwb3J0IGNsYXNzIFN1cGFiYXNlUHJvdmlkZXIgZXh0ZW5kcyBEYXRhYmFzZVByb3ZpZGVyIHtcbiAgYXN5bmMgY29ubmVjdCgpIHtcbiAgICB0aGlzLnR5cGUgPSAnc3VwYWJhc2UnO1xuICAgIGlmICh0aGlzLmNsaWVudCkgcmV0dXJuO1xuICAgIHRoaXMuY2xpZW50ID0gYXdhaXQgZ2V0U3VwYWJhc2VDbGllbnQoKTtcbiAgfVxuXG4gIGFzeW5jIHF1ZXJ5KHNxbCwgcGFyYW1zID0gW10pIHtcbiAgICBpZiAoIXRoaXMuY2xpZW50KSB0aHJvdyBuZXcgRXJyb3IoJ1N1cGFiYXNlIG5vdCBjb25uZWN0ZWQuIENhbGwgY29ubmVjdCgpIGZpcnN0LicpO1xuXG4gICAgY29uc3QgcXVlcnlUZXh0ID0gYmluZElubGluZShzcWwsIHBhcmFtcyk7XG5cbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCB0aGlzLmNsaWVudC5ycGMoJ2V4ZWNfc3FsJywgeyBxdWVyeV90ZXh0OiBxdWVyeVRleHQgfSk7XG5cbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IGNvZGUgPSBlcnJvci5jb2RlIHx8ICcnO1xuICAgICAgY29uc3QgbWVzc2FnZSA9IChlcnJvci5tZXNzYWdlIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgY29uc3Qgbm90SW5zdGFsbGVkID1cbiAgICAgICAgY29kZSA9PT0gJ1BHUlNUMjAyJyB8fFxuICAgICAgICBjb2RlID09PSAnNDI4ODMnIHx8XG4gICAgICAgIG1lc3NhZ2UuaW5jbHVkZXMoJ2V4ZWNfc3FsJykgfHxcbiAgICAgICAgbWVzc2FnZS5pbmNsdWRlcygnY291bGQgbm90IGZpbmQgdGhlIGZ1bmN0aW9uJyk7XG4gICAgICBpZiAobm90SW5zdGFsbGVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihFWEVDX1NRTF9OT1RfSU5TVEFMTEVEX0hJTlQpO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yLm1lc3NhZ2UgfHwgJ1N1cGFiYXNlIFJQQyBleGVjX3NxbCBmYWlsZWQuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIEFycmF5LmlzQXJyYXkoZGF0YSkgPyBkYXRhIDogW107XG4gIH1cblxuICBnZXRDbGllbnQoKSB7XG4gICAgaWYgKCF0aGlzLmNsaWVudCkgdGhyb3cgbmV3IEVycm9yKCdTdXBhYmFzZSBub3QgY29ubmVjdGVkLiBDYWxsIGNvbm5lY3QoKSBmaXJzdC4nKTtcbiAgICByZXR1cm4gdGhpcy5jbGllbnQ7XG4gIH1cblxuICB0YWJsZShuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0Q2xpZW50KCkuZnJvbShuYW1lKTtcbiAgfVxuXG4gIGFzeW5jIGRpc2Nvbm5lY3QoKSB7XG4gIH1cbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiSDpcXFxcY29kZVxcXFxDb3JlWFxcXFxzcmNcXFxcZGF0YVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiSDpcXFxcY29kZVxcXFxDb3JlWFxcXFxzcmNcXFxcZGF0YVxcXFxpbmRleC5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vSDovY29kZS9Db3JlWC9zcmMvZGF0YS9pbmRleC5qc1wiO2ltcG9ydCB7IGNvbmZpZyB9IGZyb20gJy4uL2NvbmZpZy9pbmRleC5qcyc7XG5pbXBvcnQgeyBTdXBhYmFzZVByb3ZpZGVyIH0gZnJvbSAnLi9wcm92aWRlcnMvU3VwYWJhc2VQcm92aWRlci5qcyc7XG5cbmxldCBkYkluc3RhbmNlID0gbnVsbDtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXREYXRhYmFzZShwcm92aWRlclR5cGUsIHByb3ZpZGVyQ29uZmlnKSB7XG4gIGNvbnN0IHR5cGUgPSBwcm92aWRlclR5cGUgfHwgY29uZmlnLmRhdGFiYXNlUHJvdmlkZXI7XG4gIGlmICh0eXBlICYmIHR5cGUgIT09ICdzdXBhYmFzZScpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGRhdGFiYXNlIHByb3ZpZGVyOiAke3R5cGV9LiBPbmx5ICdzdXBhYmFzZScgaXMgc3VwcG9ydGVkLmApO1xuICB9XG5cbiAgY29uc3QgY2ZnID0gcHJvdmlkZXJDb25maWcgfHwge307XG5cbiAgY29uc3QgcHJvdmlkZXIgPSBuZXcgU3VwYWJhc2VQcm92aWRlcigpO1xuICBhd2FpdCBwcm92aWRlci5jb25uZWN0KHtcbiAgICB1cmw6IGNmZy51cmwgfHwgY29uZmlnLnN1cGFiYXNlVXJsLFxuICAgIGFub25LZXk6IGNmZy5hbm9uS2V5IHx8IGNvbmZpZy5zdXBhYmFzZUFub25LZXksXG4gIH0pO1xuXG4gIGNvbnN0IGRiID0ge1xuICAgIHByb3ZpZGVyLFxuICAgIHVzZXJzOiBudWxsLFxuICAgIHJvbGVzOiBudWxsLFxuICAgIHNldHRpbmdzOiBudWxsLFxuICAgIHF1ZXJ5OiAoc3FsLCBwYXJhbXMpID0+IHByb3ZpZGVyLnF1ZXJ5KHNxbCwgcGFyYW1zKSxcbiAgICBpc1N1cGFiYXNlOiB0cnVlLFxuICAgIHN1cGFiYXNlOiBwcm92aWRlci5nZXRDbGllbnQoKSxcbiAgICBfZGF0YWJhc2VOYW1lOiAoY2ZnLnVybCB8fCBjb25maWcuc3VwYWJhc2VVcmwpPy5tYXRjaCgvaHR0cHM6XFwvXFwvKFteLl0rKS8pPy5bMV0gfHwgJ1N1cGFiYXNlJyxcbiAgfTtcblxuICBkYkluc3RhbmNlID0gZGI7XG4gIHJldHVybiBkYjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERhdGFiYXNlKCkge1xuICBpZiAoIWRiSW5zdGFuY2UpIHRocm93IG5ldyBFcnJvcignRGF0YWJhc2Ugbm90IGluaXRpYWxpemVkLiBDYWxsIGluaXREYXRhYmFzZSgpIGZpcnN0LicpO1xuICByZXR1cm4gZGJJbnN0YW5jZTtcbn0iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkg6XFxcXGNvZGVcXFxcQ29yZVhcXFxcc3JjXFxcXGF1ZGl0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJIOlxcXFxjb2RlXFxcXENvcmVYXFxcXHNyY1xcXFxhdWRpdFxcXFxBdWRpdFNlcnZpY2UuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0g6L2NvZGUvQ29yZVgvc3JjL2F1ZGl0L0F1ZGl0U2VydmljZS5qc1wiO2ltcG9ydCB7IGdldERhdGFiYXNlIH0gZnJvbSAnLi4vZGF0YS9pbmRleC5qcyc7XG5cbmV4cG9ydCBjbGFzcyBBdWRpdFNlcnZpY2Uge1xuICBhc3luYyBsb2dDaGFuZ2UoeyBzZXR0aW5nLCBvbGRWYWx1ZSwgbmV3VmFsdWUsIHVzZXJJZCB9KSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRiID0gZ2V0RGF0YWJhc2UoKTtcbiAgICAgIGF3YWl0IGRiLnF1ZXJ5KFxuICAgICAgICBgSU5TRVJUIElOVE8gYXVkaXRfbG9ncyAoc2V0dGluZywgb2xkX3ZhbHVlLCBuZXdfdmFsdWUsIGNoYW5nZWRfYnksIGNoYW5nZWRfYXQpXG4gICAgICAgICBWQUxVRVMgKCQxLCAkMiwgJDMsICQ0LCBOT1coKSlgLFxuICAgICAgICBbc2V0dGluZywgSlNPTi5zdHJpbmdpZnkob2xkVmFsdWUpLCBKU09OLnN0cmluZ2lmeShuZXdWYWx1ZSksIHVzZXJJZF1cbiAgICAgICk7XG4gICAgfSBjYXRjaCB7fVxuICB9XG59XG5cbmV4cG9ydCBjb25zdCBhdWRpdFNlcnZpY2UgPSBuZXcgQXVkaXRTZXJ2aWNlKCk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkg6XFxcXGNvZGVcXFxcQ29yZVhcXFxcc3JjXFxcXGNvbmZpZ1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiSDpcXFxcY29kZVxcXFxDb3JlWFxcXFxzcmNcXFxcY29uZmlnXFxcXHNlcnZlclNlY3JldHMuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0g6L2NvZGUvQ29yZVgvc3JjL2NvbmZpZy9zZXJ2ZXJTZWNyZXRzLmpzXCI7Ly8gU2VydmVyLW9ubHkgc2VjcmV0IGFjY2Vzc29ycy5cbi8vXG4vLyBUaGVzZSB2YWx1ZXMgY29tZSBmcm9tIHRoZSBkZXBsb3ltZW50IHBsYXRmb3JtJ3MgZW52aXJvbm1lbnQgKHByb2Nlc3MuZW52KVxuLy8gYW5kIG11c3QgTkVWRVIgYmUgZXhwb3NlZCB0byB0aGUgYnJvd3NlciBidW5kbGUuIFRoZXkgYXJlIGRlbGliZXJhdGVseSBpbiBhXG4vLyBzZXBhcmF0ZSBtb2R1bGUgZnJvbSBgc3JjL2NvbmZpZy9pbmRleC5qc2AgKHdoaWNoIGlzIGltcG9ydGVkIGJ5IGNsaWVudFxuLy8gY29kZSkgc28gdGhhdCBubyBzdGF0aWMgYGltcG9ydC5tZXRhLmVudi5WSVRFX1NVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVlgXG4vLyByZWZlcmVuY2UgY2FuIHB1bGwgdGhlIHNlY3JldCBpbnRvIHRoZSBjbGllbnQgYnVpbGQuIE9ubHkgc2VydmVyLXNpZGUgY29kZVxuLy8gKHNlcnZlci9hcGkuanMsIHRoZSBWaXRlIGRldiBzZXJ2ZXIgcGx1Z2luKSBpbXBvcnRzIHRoaXMgbW9kdWxlLlxuLy9cbi8vIE5vdGUgb24gdGhlIGVudiB2YXIgbmFtZTogdGhlIGRlcGxveW1lbnQgcGxhdGZvcm0gc3VwcGxpZXMgdGhlIFN1cGFiYXNlXG4vLyBzZXJ2aWNlIHJvbGUga2V5IHVuZGVyIHRoZSBwcm9qZWN0J3MgZW52aXJvbm1lbnQuIFdlIGFjY2VwdCBlaXRoZXIgdGhlXG4vLyBub24tcHJlZml4ZWQgbmFtZSBTVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZICh0aGUgc3RhbmRhcmQgU3VwYWJhc2UgQ0kvQ0Rcbi8vIGNvbnZlbnRpb24pIG9yIHRoZSBsZWdhY3kgVklURV9TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZIGZvciBiYWNrd2FyZFxuLy8gY29tcGF0aWJpbGl0eSB3aXRoIGV4aXN0aW5nIGRlcGxveW1lbnRzIFx1MjAxNCBidXQgYmVjYXVzZSB0aGlzIG1vZHVsZSByZWFkcyB2aWFcbi8vIGBwcm9jZXNzLmVudmAgKHNlcnZlciBydW50aW1lKSByYXRoZXIgdGhhbiBgaW1wb3J0Lm1ldGEuZW52YCAoYnVpbGQtdGltZVxuLy8gY2xpZW50IGlubGluaW5nKSwgbmVpdGhlciBuYW1lIGxlYWtzIGludG8gdGhlIGJyb3dzZXIgYnVuZGxlLlxuZXhwb3J0IGZ1bmN0aW9uIGdldFN1cGFiYXNlU2VydmljZVJvbGVLZXkoKSB7XG4gIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiB1bmRlZmluZWQ7XG4gIHJldHVybiAoXG4gICAgcHJvY2Vzcy5lbnYuU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWSB8fFxuICAgIHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWSB8fFxuICAgIHVuZGVmaW5lZFxuICApO1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJIOlxcXFxjb2RlXFxcXENvcmVYXFxcXHNlcnZlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiSDpcXFxcY29kZVxcXFxDb3JlWFxcXFxzZXJ2ZXJcXFxcYXBpLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9IOi9jb2RlL0NvcmVYL3NlcnZlci9hcGkuanNcIjtpbXBvcnQgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVBcGlSZXF1ZXN0KHJlcSwgcmVzLCBkYikge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwsIGBodHRwOi8vJHtyZXEuaGVhZGVycy5ob3N0fWApO1xuICBjb25zdCBwYXRoID0gdXJsLnBhdGhuYW1lO1xuICBjb25zdCBtZXRob2QgPSByZXEubWV0aG9kLnRvVXBwZXJDYXNlKCk7XG5cbiAgbGV0IGJvZHkgPSAnJztcbiAgcmVxLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7IGJvZHkgKz0gY2h1bms7IH0pO1xuICByZXEub24oJ2VuZCcsIGFzeW5jICgpID0+IHtcbiAgICBsZXQgcGFyc2VkO1xuICAgIHRyeSB7IHBhcnNlZCA9IGJvZHkgPyBKU09OLnBhcnNlKGJvZHkpIDoge307IH0gY2F0Y2ggeyBwYXJzZWQgPSB7fTsgfVxuXG4gICAgY29uc3Qgc2VuZCA9IChzdGF0dXMsIGRhdGEpID0+IHtcbiAgICAgIGlmIChyZXMuaGVhZGVyc1NlbnQpIHJldHVybjtcbiAgICAgIHJlcy53cml0ZUhlYWQoc3RhdHVzLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XG4gICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcbiAgICB9O1xuXG4gICAgY29uc3QgdG9rZW4gPSByZXEuaGVhZGVycy5hdXRob3JpemF0aW9uPy5yZXBsYWNlKCdCZWFyZXIgJywgJycpIHx8ICcnO1xuICAgIGxldCBjdXJyZW50VXNlciA9IG51bGw7XG4gICAgaWYgKHRva2VuKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYXJ0cyA9IHRva2VuLnNwbGl0KCcuJyk7XG4gICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPT09IDMpIHtcbiAgICAgICAgICBjb25zdCByYXcgPSBKU09OLnBhcnNlKEJ1ZmZlci5mcm9tKHBhcnRzWzFdLCAnYmFzZTY0JykudG9TdHJpbmcoKSk7XG4gICAgICAgICAgY29uc3QgbWV0YSA9IHJhdy51c2VyX21ldGFkYXRhIHx8IHJhdy5hcHBfbWV0YWRhdGEgfHwge307XG4gICAgICAgICAgY3VycmVudFVzZXIgPSB7XG4gICAgICAgICAgICAuLi5yYXcsXG4gICAgICAgICAgICBpZDogcmF3LnN1YiB8fCByYXcuaWQsXG4gICAgICAgICAgICBwZXJtaXNzaW9uczogcmF3LnBlcm1pc3Npb25zIHx8IG1ldGEucGVybWlzc2lvbnMgfHwgW10sXG4gICAgICAgICAgICBmdWxsX2FjY2VzczogcmF3LmZ1bGxfYWNjZXNzID09PSB0cnVlIHx8IG1ldGEuZnVsbF9hY2Nlc3MgPT09IHRydWUsXG4gICAgICAgICAgICByb2xlOiByYXcucm9sZSB8fCBtZXRhLnJvbGUgfHwgJ3VzZXInLFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja1Blcm1pc3Npb24ocGVybSkge1xuICAgICAgaWYgKCFjdXJyZW50VXNlcikgcmV0dXJuIHNlbmQoNDAxLCB7IGVycm9yOiAnQXV0aGVudGljYXRpb24gcmVxdWlyZWQuJyB9KTtcbiAgICAgIGlmICghY3VycmVudFVzZXIucGVybWlzc2lvbnM/LmluY2x1ZGVzKHBlcm0pICYmICFjdXJyZW50VXNlci5wZXJtaXNzaW9ucz8uaW5jbHVkZXMoJyonKSkge1xuICAgICAgICBzZW5kKDQwMywgeyBlcnJvcjogJ0ZvcmJpZGRlbi4nIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgaWYgKGRiLmlzU3VwYWJhc2UpIHtcbiAgICAgICAgYXdhaXQgaGFuZGxlU3VwYWJhc2UoZGIuc3VwYWJhc2UsIHBhdGgsIG1ldGhvZCwgcGFyc2VkLCBzZW5kLCBjdXJyZW50VXNlciwgdG9rZW4pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaGFuZGxlZCA9IGF3YWl0IGhhbmRsZUludm9pY2VNZW1vcnkoZGIsIHBhdGgsIG1ldGhvZCwgcGFyc2VkLCBzZW5kLCBjdXJyZW50VXNlcik7XG4gICAgICAgIGlmICghaGFuZGxlZCkgYXdhaXQgaGFuZGxlTWVtb3J5KGRiLCBwYXRoLCBtZXRob2QsIHBhcnNlZCwgc2VuZCwgY3VycmVudFVzZXIpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgc2VuZCg1MDAsIHsgZXJyb3I6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3IuJyB9KTtcbiAgICB9XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVNZW1vcnkoZGIsIHBhdGgsIG1ldGhvZCwgcGFyc2VkLCBzZW5kLCBjdXJyZW50VXNlcikge1xuICBmdW5jdGlvbiBjaGVja1Blcm1pc3Npb24ocGVybSkge1xuICAgIGlmICghY3VycmVudFVzZXIpIHsgc2VuZCg0MDEsIHsgZXJyb3I6ICdBdXRoZW50aWNhdGlvbiByZXF1aXJlZC4nIH0pOyByZXR1cm4gZmFsc2U7IH1cbiAgICBpZiAoIWN1cnJlbnRVc2VyLnBlcm1pc3Npb25zPy5pbmNsdWRlcyhwZXJtKSAmJiAhY3VycmVudFVzZXIucGVybWlzc2lvbnM/LmluY2x1ZGVzKCcqJykpIHtcbiAgICAgIHNlbmQoNDAzLCB7IGVycm9yOiAnRm9yYmlkZGVuLicgfSk7IHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAocGF0aCA9PT0gJy9hcGkvYXV0aC9sb2dpbicgJiYgbWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgZGIudXNlcnMuZmluZEJ5RW1haWwocGFyc2VkLmlkZW50aWZpZXIpO1xuICAgIGlmICghdXNlcikgcmV0dXJuIHNlbmQoNDAxLCB7IGVycm9yOiAnSW52YWxpZCBjcmVkZW50aWFscy4nIH0pO1xuICAgIGNvbnN0IHsgcGFzc3dvcmRfaGFzaCwgLi4uc2FmZSB9ID0gdXNlcjtcbiAgICBjb25zdCBwYXlsb2FkID0geyBpZDogdXNlci5pZCwgcm9sZTogdXNlci5yb2xlLCBwZXJtaXNzaW9uczogdXNlci5wZXJtaXNzaW9ucyB8fCBbXSB9O1xuICAgIGNvbnN0IGhlYWRlciA9IEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KHsgYWxnOiAnSFMyNTYnIH0pKS50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgY29uc3QgYm9keUI2NCA9IEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KHBheWxvYWQpKS50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHVzZXI6IHNhZmUsIHRva2VuOiBgJHtoZWFkZXJ9LiR7Ym9keUI2NH0uc2lnYCB9KTtcbiAgfVxuXG4gIGlmIChwYXRoID09PSAnL2FwaS9hdXRoL3JlZ2lzdGVyJyAmJiBtZXRob2QgPT09ICdQT1NUJykge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gYXdhaXQgZGIudXNlcnMuZmluZEJ5RW1haWwocGFyc2VkLmVtYWlsKTtcbiAgICBpZiAoZXhpc3RpbmcpIHJldHVybiBzZW5kKDQwOSwgeyBlcnJvcjogJ0VtYWlsIGFscmVhZHkgcmVnaXN0ZXJlZC4nIH0pO1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBkYi51c2Vycy5jcmVhdGUoe1xuICAgICAgbmFtZTogcGFyc2VkLm5hbWUsIGVtYWlsOiBwYXJzZWQuZW1haWwsIHBob25lOiBwYXJzZWQucGhvbmUgfHwgJycsXG4gICAgICBwYXNzd29yZF9oYXNoOiBwYXJzZWQucGFzc3dvcmQsIHJvbGU6IHBhcnNlZC5yb2xlIHx8ICd1c2VyJyxcbiAgICAgIHBlcm1pc3Npb25zOiBbXSwgc3RhdHVzOiAnYWN0aXZlJyxcbiAgICB9KTtcbiAgICBpZiAoIXVzZXIpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogJ1JlZ2lzdHJhdGlvbiBmYWlsZWQuJyB9KTtcbiAgICBjb25zdCB7IHBhc3N3b3JkX2hhc2gsIC4uLnNhZmUgfSA9IHVzZXI7XG4gICAgY29uc3QgcGF5bG9hZCA9IHsgaWQ6IHVzZXIuaWQsIHJvbGU6IHVzZXIucm9sZSwgcGVybWlzc2lvbnM6IHVzZXIucGVybWlzc2lvbnMgfHwgW10gfTtcbiAgICBjb25zdCBoZWFkZXIgPSBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeSh7IGFsZzogJ0hTMjU2JyB9KSkudG9TdHJpbmcoJ2Jhc2U2NCcpO1xuICAgIGNvbnN0IGJvZHlCNjQgPSBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShwYXlsb2FkKSkudG9TdHJpbmcoJ2Jhc2U2NCcpO1xuICAgIHJldHVybiBzZW5kKDIwMSwgeyB1c2VyOiBzYWZlLCB0b2tlbjogYCR7aGVhZGVyfS4ke2JvZHlCNjR9LnNpZ2AsIG5vdGljZTogJ0FjY291bnQgY3JlYXRlZCBzdWNjZXNzZnVsbHkuJyB9KTtcbiAgfVxuXG4gIGlmIChwYXRoID09PSAnL2FwaS9hdXRoL2xvZ291dCcgJiYgbWV0aG9kID09PSAnUE9TVCcpIHJldHVybiBzZW5kKDIwMCwgeyBvazogdHJ1ZSB9KTtcbiAgaWYgKHBhdGggPT09ICcvYXBpL2F1dGgvbWUnICYmIG1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICBpZiAoIWN1cnJlbnRVc2VyKSByZXR1cm4gc2VuZCg0MDEsIHsgZXJyb3I6ICdOb3QgYXV0aGVudGljYXRlZC4nIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyB1c2VyOiBjdXJyZW50VXNlciB9KTtcbiAgfVxuXG4gIGlmIChtZXRob2QgPT09ICdHRVQnICYmIHBhdGggPT09ICcvYXBpL3JvbGVzJykge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdyb2xlOnJlYWQnKSkgcmV0dXJuO1xuICAgIGNvbnN0IHJvbGVzID0gYXdhaXQgZGIucm9sZXMuZmluZEFsbChjdXJyZW50VXNlcik7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHJvbGVzIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3JvbGVzXFwvKC4rKSQvKSkge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdyb2xlOnJlYWQnKSkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3JvbGVzXFwvKC4rKSQvKVsxXTtcbiAgICBjb25zdCByb2xlID0gYXdhaXQgZGIucm9sZXMuZmluZEJ5SWQoaWQsIGN1cnJlbnRVc2VyKTtcbiAgICBpZiAoIXJvbGUpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ1JvbGUgbm90IGZvdW5kLicgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHJvbGUgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnUE9TVCcgJiYgcGF0aCA9PT0gJy9hcGkvcm9sZXMnKSB7XG4gICAgaWYgKCFjaGVja1Blcm1pc3Npb24oJ3JvbGU6Y3JlYXRlJykpIHJldHVybjtcbiAgICBjb25zdCByb2xlID0gYXdhaXQgZGIucm9sZXMuY3JlYXRlKHBhcnNlZCwgY3VycmVudFVzZXIpO1xuICAgIGlmICghcm9sZSkgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiAnRmFpbGVkIHRvIGNyZWF0ZSByb2xlLicgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAxLCB7IHJvbGUgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnUFVUJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvcm9sZXNcXC8oLispJC8pKSB7XG4gICAgaWYgKCFjaGVja1Blcm1pc3Npb24oJ3JvbGU6dXBkYXRlJykpIHJldHVybjtcbiAgICBjb25zdCBpZCA9IHBhdGgubWF0Y2goL15cXC9hcGlcXC9yb2xlc1xcLyguKykkLylbMV07XG4gICAgY29uc3Qgcm9sZSA9IGF3YWl0IGRiLnJvbGVzLnVwZGF0ZShpZCwgcGFyc2VkLCBjdXJyZW50VXNlcik7XG4gICAgaWYgKCFyb2xlKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdSb2xlIG5vdCBmb3VuZC4nIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyByb2xlIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ0RFTEVURScgJiYgcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3JvbGVzXFwvKC4rKSQvKSkge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdyb2xlOmRlbGV0ZScpKSByZXR1cm47XG4gICAgY29uc3QgaWQgPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvcm9sZXNcXC8oLispJC8pWzFdO1xuICAgIGNvbnN0IG9rID0gYXdhaXQgZGIucm9sZXMuZGVsZXRlKGlkLCBjdXJyZW50VXNlcik7XG4gICAgaWYgKCFvaykgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnUm9sZSBub3QgZm91bmQuJyB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgb2s6IHRydWUgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnR0VUJyAmJiBwYXRoID09PSAnL2FwaS91c2VycycpIHtcbiAgICBpZiAoIWNoZWNrUGVybWlzc2lvbigndXNlcjpyZWFkJykpIHJldHVybjtcbiAgICBjb25zdCB1c2VycyA9IGF3YWl0IGRiLnVzZXJzLmZpbmRBbGwoY3VycmVudFVzZXIpO1xuICAgIGNvbnN0IHNhZmUgPSB1c2Vycy5tYXAoKHUpID0+IHsgY29uc3QgeyBwYXNzd29yZF9oYXNoLCAuLi5yZXN0IH0gPSB1OyByZXR1cm4gcmVzdDsgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHVzZXJzOiBzYWZlIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3VzZXJzXFwvKC4rKSQvKSkge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCd1c2VyOnJlYWQnKSkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3VzZXJzXFwvKC4rKSQvKVsxXTtcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgZGIudXNlcnMuZmluZEJ5SWQoaWQsIGN1cnJlbnRVc2VyKTtcbiAgICBpZiAoIXVzZXIpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ1VzZXIgbm90IGZvdW5kLicgfSk7XG4gICAgY29uc3QgeyBwYXNzd29yZF9oYXNoLCAuLi5zYWZlIH0gPSB1c2VyO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyB1c2VyOiBzYWZlIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ1BPU1QnICYmIHBhdGggPT09ICcvYXBpL3VzZXJzJykge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCd1c2VyOmNyZWF0ZScpKSByZXR1cm47XG4gICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCBkYi51c2Vycy5maW5kQnlFbWFpbChwYXJzZWQuZW1haWwpO1xuICAgIGlmIChleGlzdGluZykgcmV0dXJuIHNlbmQoNDA5LCB7IGVycm9yOiAnRW1haWwgYWxyZWFkeSBpbiB1c2UuJyB9KTtcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgZGIudXNlcnMuY3JlYXRlKHBhcnNlZCwgY3VycmVudFVzZXIpO1xuICAgIGlmICghdXNlcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiAnRmFpbGVkIHRvIGNyZWF0ZSB1c2VyLicgfSk7XG4gICAgY29uc3QgeyBwYXNzd29yZF9oYXNoLCAuLi5zYWZlIH0gPSB1c2VyO1xuICAgIHJldHVybiBzZW5kKDIwMSwgeyB1c2VyOiBzYWZlIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ1BVVCcgJiYgcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3VzZXJzXFwvKC4rKSQvKSkge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCd1c2VyOnVwZGF0ZScpKSByZXR1cm47XG4gICAgY29uc3QgaWQgPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvdXNlcnNcXC8oLispJC8pWzFdO1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBkYi51c2Vycy51cGRhdGUoaWQsIHBhcnNlZCwgY3VycmVudFVzZXIpO1xuICAgIGlmICghdXNlcikgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnVXNlciBub3QgZm91bmQuJyB9KTtcbiAgICBjb25zdCB7IHBhc3N3b3JkX2hhc2gsIC4uLnNhZmUgfSA9IHVzZXI7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHVzZXI6IHNhZmUgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnREVMRVRFJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvdXNlcnNcXC8oLispJC8pKSB7XG4gICAgaWYgKCFjaGVja1Blcm1pc3Npb24oJ3VzZXI6ZGVsZXRlJykpIHJldHVybjtcbiAgICBjb25zdCBpZCA9IHBhdGgubWF0Y2goL15cXC9hcGlcXC91c2Vyc1xcLyguKykkLylbMV07XG4gICAgY29uc3Qgb2sgPSBhd2FpdCBkYi51c2Vycy5kZWxldGUoaWQsIGN1cnJlbnRVc2VyKTtcbiAgICBpZiAoIW9rKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdVc2VyIG5vdCBmb3VuZC4nIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBvazogdHJ1ZSB9KTtcbiAgfVxuXG4gIGlmIChtZXRob2QgPT09ICdHRVQnICYmIHBhdGggPT09ICcvYXBpL3NldHRpbmdzJykge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdzZXR0aW5nczpyZWFkJykpIHJldHVybjtcbiAgICBjb25zdCBzZXR0aW5ncyA9IGF3YWl0IGRiLnNldHRpbmdzLmdldEFsbCgpO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBzZXR0aW5ncyB9KTtcbiAgfVxuXG4gIGlmIChtZXRob2QgPT09ICdQVVQnICYmIHBhdGggPT09ICcvYXBpL3NldHRpbmdzJykge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdzZXR0aW5nczp1cGRhdGUnKSkgcmV0dXJuO1xuICAgIGNvbnN0IG9sZFNldHRpbmdzID0gYXdhaXQgZGIuc2V0dGluZ3MuZ2V0QWxsKCk7XG4gICAgY29uc3Qgc3RyaW5naWZpZWQgPSB7fTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhwYXJzZWQpKSB7XG4gICAgICBzdHJpbmdpZmllZFtrZXldID0gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IHZhbHVlIDogSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgIH1cbiAgICBhd2FpdCBkYi5zZXR0aW5ncy51cGRhdGUoc3RyaW5naWZpZWQpO1xuICAgIC8vIEF1ZGl0IGxvZyBlYWNoIGNoYW5nZWQgc2V0dGluZ1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHBhcnNlZCkpIHtcbiAgICAgIGNvbnN0IG9sZFZhbCA9IG9sZFNldHRpbmdzPy5ba2V5XTtcbiAgICAgIGlmIChvbGRWYWwgIT09IHVuZGVmaW5lZCAmJiBvbGRWYWwgIT09IHZhbHVlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgeyBhdWRpdFNlcnZpY2UgfSA9IGF3YWl0IGltcG9ydCgnLi4vc3JjL2F1ZGl0L0F1ZGl0U2VydmljZS5qcycpO1xuICAgICAgICAgIGF3YWl0IGF1ZGl0U2VydmljZS5sb2dDaGFuZ2UoeyBzZXR0aW5nOiBrZXksIG9sZFZhbHVlOiBvbGRWYWwsIG5ld1ZhbHVlOiB2YWx1ZSwgdXNlcklkOiBjdXJyZW50VXNlcj8uaWQgfSk7XG4gICAgICAgIH0gY2F0Y2gge31cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IG9rOiB0cnVlIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aCA9PT0gJy9hcGkvbGFuZ3VhZ2VzJykge1xuICAgIHJldHVybiBzZW5kKDIwMCwge1xuICAgICAgbGFuZ3VhZ2VzOiBbXG4gICAgICAgIHsgY29kZTogJ2VuJywgbmFtZTogJ0VuZ2xpc2gnLCBuYXRpdmVOYW1lOiAnRW5nbGlzaCcgfSxcbiAgICAgICAgeyBjb2RlOiAnZXMnLCBuYW1lOiAnU3BhbmlzaCcsIG5hdGl2ZU5hbWU6ICdFc3BhXHUwMEYxb2wnIH0sXG4gICAgICAgIHsgY29kZTogJ2ZyJywgbmFtZTogJ0ZyZW5jaCcsIG5hdGl2ZU5hbWU6ICdGcmFuXHUwMEU3YWlzJyB9LFxuICAgICAgICB7IGNvZGU6ICdkZScsIG5hbWU6ICdHZXJtYW4nLCBuYXRpdmVOYW1lOiAnRGV1dHNjaCcgfSxcbiAgICAgICAgeyBjb2RlOiAncHQnLCBuYW1lOiAnUG9ydHVndWVzZScsIG5hdGl2ZU5hbWU6ICdQb3J0dWd1XHUwMEVBcycgfSxcbiAgICAgICAgeyBjb2RlOiAnaXQnLCBuYW1lOiAnSXRhbGlhbicsIG5hdGl2ZU5hbWU6ICdJdGFsaWFubycgfSxcbiAgICAgICAgeyBjb2RlOiAnbmwnLCBuYW1lOiAnRHV0Y2gnLCBuYXRpdmVOYW1lOiAnTmVkZXJsYW5kcycgfSxcbiAgICAgICAgeyBjb2RlOiAncGwnLCBuYW1lOiAnUG9saXNoJywgbmF0aXZlTmFtZTogJ1BvbHNraScgfSxcbiAgICAgICAgeyBjb2RlOiAncnUnLCBuYW1lOiAnUnVzc2lhbicsIG5hdGl2ZU5hbWU6ICdcdTA0MjBcdTA0NDNcdTA0NDFcdTA0NDFcdTA0M0FcdTA0MzhcdTA0MzknIH0sXG4gICAgICAgIHsgY29kZTogJ2phJywgbmFtZTogJ0phcGFuZXNlJywgbmF0aXZlTmFtZTogJ1x1NjVFNVx1NjcyQ1x1OEE5RScgfSxcbiAgICAgICAgeyBjb2RlOiAna28nLCBuYW1lOiAnS29yZWFuJywgbmF0aXZlTmFtZTogJ1x1RDU1Q1x1QUQ2RFx1QzVCNCcgfSxcbiAgICAgICAgeyBjb2RlOiAnemgnLCBuYW1lOiAnQ2hpbmVzZSAoU2ltcGxpZmllZCknLCBuYXRpdmVOYW1lOiAnXHU3QjgwXHU0RjUzXHU0RTJEXHU2NTg3JyB9LFxuICAgICAgICB7IGNvZGU6ICdhcicsIG5hbWU6ICdBcmFiaWMnLCBuYXRpdmVOYW1lOiAnXHUwNjI3XHUwNjQ0XHUwNjM5XHUwNjMxXHUwNjI4XHUwNjRBXHUwNjI5JyB9LFxuICAgICAgICB7IGNvZGU6ICdoaScsIG5hbWU6ICdIaW5kaScsIG5hdGl2ZU5hbWU6ICdcdTA5MzlcdTA5M0ZcdTA5MjhcdTA5NERcdTA5MjZcdTA5NDAnIH0sXG4gICAgICAgIHsgY29kZTogJ2JuJywgbmFtZTogJ0JlbmdhbGknLCBuYXRpdmVOYW1lOiAnXHUwOUFDXHUwOUJFXHUwOTgyXHUwOUIyXHUwOUJFJyB9LFxuICAgICAgXSxcbiAgICB9KTtcbiAgfVxuXG4gIGlmIChtZXRob2QgPT09ICdQT1NUJyAmJiBwYXRoID09PSAnL2FwaS9zZXR0aW5ncy9sb2dvJykge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdzZXR0aW5nczp1cGRhdGUnKSkgcmV0dXJuO1xuICAgIGlmICghcGFyc2VkLmZpbGVEYXRhKSByZXR1cm4gc2VuZCg0MDAsIHsgZXJyb3I6ICdObyBmaWxlIGRhdGEgcHJvdmlkZWQuJyB9KTtcbiAgICBhd2FpdCBkYi5zZXR0aW5ncy51cGRhdGUoeyBsb2dvOiBwYXJzZWQuZmlsZURhdGEgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IG9rOiB0cnVlLCBsb2dvOiBwYXJzZWQuZmlsZURhdGEgfSk7XG4gIH1cblxuICAvLyA9PT09PSBQcmVmaXggLyBTdWZmaXggU2V0dGluZ3MgPT09PT1cbiAgY29uc3QgUFJFRklYX1NUT1JFX0tFWSA9ICdfcHJlZml4X3NldHRpbmdzJztcbiAgYXN5bmMgZnVuY3Rpb24gbG9hZFByZWZpeGVzKCkge1xuICAgIGlmIChkYi5zZXR0aW5ncykge1xuICAgICAgY29uc3QgYWxsID0gYXdhaXQgZGIuc2V0dGluZ3MuZ2V0QWxsKCk7XG4gICAgICBjb25zdCByYXcgPSBhbGxbUFJFRklYX1NUT1JFX0tFWV07XG4gICAgICBpZiAocmF3KSB7XG4gICAgICAgIHRyeSB7IHJldHVybiB0eXBlb2YgcmF3ID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2UocmF3KSA6IHJhdzsgfSBjYXRjaCB7fVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW107XG4gIH1cbiAgYXN5bmMgZnVuY3Rpb24gc2F2ZVByZWZpeGVzKGl0ZW1zKSB7XG4gICAgaWYgKGRiLnNldHRpbmdzKSB7XG4gICAgICBhd2FpdCBkYi5zZXR0aW5ncy51cGRhdGUoeyBbUFJFRklYX1NUT1JFX0tFWV06IEpTT04uc3RyaW5naWZ5KGl0ZW1zKSB9KTtcbiAgICB9XG4gIH1cblxuICBpZiAocGF0aCA9PT0gJy9hcGkvcHJlZml4LXNldHRpbmdzJyAmJiBtZXRob2QgPT09ICdHRVQnKSB7XG4gICAgaWYgKCFjaGVja1Blcm1pc3Npb24oJ3NldHRpbmdzOnJlYWQnKSkgcmV0dXJuO1xuICAgIGxldCBpdGVtcyA9IGF3YWl0IGxvYWRQcmVmaXhlcygpO1xuICAgIGlmIChwYXJzZWQuYWN0aXZlID09PSAndHJ1ZScpIGl0ZW1zID0gaXRlbXMuZmlsdGVyKHAgPT4gcC5pc0FjdGl2ZSAhPT0gZmFsc2UpO1xuICAgIGlmIChwYXJzZWQuZGVmYXVsdCA9PT0gJ3RydWUnKSBpdGVtcyA9IGl0ZW1zLmZpbHRlcihwID0+IHAuaXNEZWZhdWx0ID09PSB0cnVlKTtcbiAgICBpZiAocGFyc2VkLmRvY1R5cGUpIGl0ZW1zID0gaXRlbXMuZmlsdGVyKHAgPT4gcC5kb2NUeXBlID09PSBwYXJzZWQuZG9jVHlwZSk7XG4gICAgaWYgKHBhcnNlZC5xKSB7XG4gICAgICBjb25zdCBxID0gcGFyc2VkLnEudG9Mb3dlckNhc2UoKTtcbiAgICAgIGl0ZW1zID0gaXRlbXMuZmlsdGVyKHAgPT4gKHAudmFsdWUgfHwgJycpLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocSkgfHwgKHAuZGVzY3JpcHRpb24gfHwgJycpLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocSkpO1xuICAgIH1cbiAgICBjb25zdCBzb3J0RmllbGQgPSBwYXJzZWQuc29ydEZpZWxkIHx8ICdzZXF1ZW5jZU9yZGVyJztcbiAgICBjb25zdCBzb3J0RGlyID0gcGFyc2VkLnNvcnREaXIgfHwgJ2FzYyc7XG4gICAgaXRlbXMgPSBbLi4uaXRlbXNdLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgIGNvbnN0IHZhID0gYVtzb3J0RmllbGRdID8/IDA7XG4gICAgICBjb25zdCB2YiA9IGJbc29ydEZpZWxkXSA/PyAwO1xuICAgICAgaWYgKHR5cGVvZiB2YSA9PT0gJ3N0cmluZycpIHJldHVybiBzb3J0RGlyID09PSAnZGVzYycgPyB2Yi5sb2NhbGVDb21wYXJlKHZhKSA6IHZhLmxvY2FsZUNvbXBhcmUodmIpO1xuICAgICAgcmV0dXJuIHNvcnREaXIgPT09ICdkZXNjJyA/IHZiIC0gdmEgOiB2YSAtIHZiO1xuICAgIH0pO1xuICAgIGNvbnN0IHBhZ2VTaXplID0gcGFyc2VJbnQocGFyc2VkLnBhZ2VTaXplLCAxMCkgfHwgMTA7XG4gICAgY29uc3QgcGFnZU51bSA9IHBhcnNlSW50KHBhcnNlZC5wYWdlLCAxMCkgfHwgMTtcbiAgICBjb25zdCB0b3RhbCA9IGl0ZW1zLmxlbmd0aDtcbiAgICBjb25zdCBwYWdlZCA9IGl0ZW1zLnNsaWNlKChwYWdlTnVtIC0gMSkgKiBwYWdlU2l6ZSwgcGFnZU51bSAqIHBhZ2VTaXplKTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgaXRlbXM6IHBhZ2VkLCB0b3RhbCB9KTtcbiAgfVxuXG4gIGlmIChwYXRoID09PSAnL2FwaS9wcmVmaXgtc2V0dGluZ3MnICYmIG1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgaWYgKCFjaGVja1Blcm1pc3Npb24oJ3NldHRpbmdzOnVwZGF0ZScpKSByZXR1cm47XG4gICAgY29uc3QgaXRlbXMgPSBhd2FpdCBsb2FkUHJlZml4ZXMoKTtcbiAgICBjb25zdCBwcmVmaXggPSB7XG4gICAgICAuLi5wYXJzZWQsXG4gICAgICBpZDogY3J5cHRvLnJhbmRvbVVVSUQgPyBjcnlwdG8ucmFuZG9tVVVJRCgpIDogRGF0ZS5ub3coKS50b1N0cmluZygzNikgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKSxcbiAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIH07XG4gICAgaWYgKHByZWZpeC5pc0RlZmF1bHQpIHtcbiAgICAgIGl0ZW1zLmZvckVhY2gocCA9PiB7IHAuaXNEZWZhdWx0ID0gZmFsc2U7IH0pO1xuICAgIH1cbiAgICBpdGVtcy5wdXNoKHByZWZpeCk7XG4gICAgYXdhaXQgc2F2ZVByZWZpeGVzKGl0ZW1zKTtcbiAgICByZXR1cm4gc2VuZCgyMDEsIHsgcHJlZml4IH0pO1xuICB9XG5cbiAgY29uc3QgcHNNYXRjaCA9IHBhdGgubWF0Y2goL15cXC9hcGlcXC9wcmVmaXgtc2V0dGluZ3NcXC8oW14vXSspJC8pO1xuICBpZiAocHNNYXRjaCkge1xuICAgIGNvbnN0IGlkID0gcHNNYXRjaFsxXTtcbiAgICBpZiAobWV0aG9kID09PSAnUFVUJykge1xuICAgICAgaWYgKCFjaGVja1Blcm1pc3Npb24oJ3NldHRpbmdzOnVwZGF0ZScpKSByZXR1cm47XG4gICAgICBjb25zdCBpdGVtcyA9IGF3YWl0IGxvYWRQcmVmaXhlcygpO1xuICAgICAgY29uc3QgaWR4ID0gaXRlbXMuZmluZEluZGV4KHAgPT4gcC5pZCA9PT0gaWQpO1xuICAgICAgaWYgKGlkeCA9PT0gLTEpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ1ByZWZpeCBub3QgZm91bmQuJyB9KTtcbiAgICAgIGlmIChwYXJzZWQuaXNEZWZhdWx0KSB7XG4gICAgICAgIGl0ZW1zLmZvckVhY2gocCA9PiB7IHAuaXNEZWZhdWx0ID0gZmFsc2U7IH0pO1xuICAgICAgfVxuICAgICAgaXRlbXNbaWR4XSA9IHsgLi4uaXRlbXNbaWR4XSwgLi4ucGFyc2VkLCBpZCB9O1xuICAgICAgYXdhaXQgc2F2ZVByZWZpeGVzKGl0ZW1zKTtcbiAgICAgIHJldHVybiBzZW5kKDIwMCwgeyBwcmVmaXg6IGl0ZW1zW2lkeF0gfSk7XG4gICAgfVxuICAgIGlmIChtZXRob2QgPT09ICdERUxFVEUnKSB7XG4gICAgICBpZiAoIWNoZWNrUGVybWlzc2lvbignc2V0dGluZ3M6ZGVsZXRlJykpIHJldHVybjtcbiAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgbG9hZFByZWZpeGVzKCk7XG4gICAgICBjb25zdCBpZHggPSBpdGVtcy5maW5kSW5kZXgocCA9PiBwLmlkID09PSBpZCk7XG4gICAgICBpZiAoaWR4ID09PSAtMSkgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnUHJlZml4IG5vdCBmb3VuZC4nIH0pO1xuICAgICAgaXRlbXMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICBhd2FpdCBzYXZlUHJlZml4ZXMoaXRlbXMpO1xuICAgICAgcmV0dXJuIHNlbmQoMjAwLCB7IG9rOiB0cnVlIH0pO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHBzRGVmYXVsdE1hdGNoID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3ByZWZpeC1zZXR0aW5nc1xcLyhbXi9dKylcXC9kZWZhdWx0JC8pO1xuICBpZiAocHNEZWZhdWx0TWF0Y2gpIHtcbiAgICBpZiAobWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdzZXR0aW5nczp1cGRhdGUnKSkgcmV0dXJuO1xuICAgICAgY29uc3QgaWQgPSBwc0RlZmF1bHRNYXRjaFsxXTtcbiAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgbG9hZFByZWZpeGVzKCk7XG4gICAgICBjb25zdCBpZHggPSBpdGVtcy5maW5kSW5kZXgocCA9PiBwLmlkID09PSBpZCk7XG4gICAgICBpZiAoaWR4ID09PSAtMSkgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnUHJlZml4IG5vdCBmb3VuZC4nIH0pO1xuICAgICAgaXRlbXMuZm9yRWFjaChwID0+IHsgcC5pc0RlZmF1bHQgPSBmYWxzZTsgfSk7XG4gICAgICBpdGVtc1tpZHhdLmlzRGVmYXVsdCA9IHRydWU7XG4gICAgICBhd2FpdCBzYXZlUHJlZml4ZXMoaXRlbXMpO1xuICAgICAgcmV0dXJuIHNlbmQoMjAwLCB7IHByZWZpeDogaXRlbXNbaWR4XSB9KTtcbiAgICB9XG4gIH1cblxuICAvLyA9PT09PSBTdWZmaXggU2V0dGluZ3MgPT09PT1cbiAgY29uc3QgU1VGRklYX1NUT1JFX0tFWSA9ICdfc3VmZml4X3NldHRpbmdzJztcbiAgYXN5bmMgZnVuY3Rpb24gbG9hZFN1ZmZpeGVzKCkge1xuICAgIGlmIChkYi5zZXR0aW5ncykge1xuICAgICAgY29uc3QgYWxsID0gYXdhaXQgZGIuc2V0dGluZ3MuZ2V0QWxsKCk7XG4gICAgICBjb25zdCByYXcgPSBhbGxbU1VGRklYX1NUT1JFX0tFWV07XG4gICAgICBpZiAocmF3KSB7IHRyeSB7IHJldHVybiB0eXBlb2YgcmF3ID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2UocmF3KSA6IHJhdzsgfSBjYXRjaCB7fSB9XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfVxuICBhc3luYyBmdW5jdGlvbiBzYXZlU3VmZml4ZXMoaXRlbXMpIHtcbiAgICBpZiAoZGIuc2V0dGluZ3MpIHsgYXdhaXQgZGIuc2V0dGluZ3MudXBkYXRlKHsgW1NVRkZJWF9TVE9SRV9LRVldOiBKU09OLnN0cmluZ2lmeShpdGVtcykgfSk7IH1cbiAgfVxuXG4gIGlmIChwYXRoID09PSAnL2FwaS9zdWZmaXgtc2V0dGluZ3MnICYmIG1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICBpZiAoIWNoZWNrUGVybWlzc2lvbignc2V0dGluZ3M6cmVhZCcpKSByZXR1cm47XG4gICAgbGV0IGl0ZW1zID0gYXdhaXQgbG9hZFN1ZmZpeGVzKCk7XG4gICAgaWYgKHBhcnNlZC5hY3RpdmUgPT09ICd0cnVlJykgaXRlbXMgPSBpdGVtcy5maWx0ZXIocCA9PiBwLmlzQWN0aXZlICE9PSBmYWxzZSk7XG4gICAgaWYgKHBhcnNlZC5kZWZhdWx0ID09PSAndHJ1ZScpIGl0ZW1zID0gaXRlbXMuZmlsdGVyKHAgPT4gcC5pc0RlZmF1bHQgPT09IHRydWUpO1xuICAgIGlmIChwYXJzZWQuZG9jVHlwZSkgaXRlbXMgPSBpdGVtcy5maWx0ZXIocCA9PiBwLmRvY1R5cGUgPT09IHBhcnNlZC5kb2NUeXBlKTtcbiAgICBpZiAocGFyc2VkLnEpIHtcbiAgICAgIGNvbnN0IHEgPSBwYXJzZWQucS50b0xvd2VyQ2FzZSgpO1xuICAgICAgaXRlbXMgPSBpdGVtcy5maWx0ZXIocCA9PiAocC52YWx1ZSB8fCAnJykudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxKSB8fCAocC5kZXNjcmlwdGlvbiB8fCAnJykudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxKSk7XG4gICAgfVxuICAgIGNvbnN0IHNvcnRGaWVsZCA9IHBhcnNlZC5zb3J0RmllbGQgfHwgJ3NlcXVlbmNlT3JkZXInO1xuICAgIGNvbnN0IHNvcnREaXIgPSBwYXJzZWQuc29ydERpciB8fCAnYXNjJztcbiAgICBpdGVtcyA9IFsuLi5pdGVtc10uc29ydCgoYSwgYikgPT4ge1xuICAgICAgY29uc3QgdmEgPSBhW3NvcnRGaWVsZF0gPz8gMDtcbiAgICAgIGNvbnN0IHZiID0gYltzb3J0RmllbGRdID8/IDA7XG4gICAgICBpZiAodHlwZW9mIHZhID09PSAnc3RyaW5nJykgcmV0dXJuIHNvcnREaXIgPT09ICdkZXNjJyA/IHZiLmxvY2FsZUNvbXBhcmUodmEpIDogdmEubG9jYWxlQ29tcGFyZSh2Yik7XG4gICAgICByZXR1cm4gc29ydERpciA9PT0gJ2Rlc2MnID8gdmIgLSB2YSA6IHZhIC0gdmI7XG4gICAgfSk7XG4gICAgY29uc3QgcGFnZVNpemUgPSBwYXJzZUludChwYXJzZWQucGFnZVNpemUsIDEwKSB8fCAxMDtcbiAgICBjb25zdCBwYWdlTnVtID0gcGFyc2VJbnQocGFyc2VkLnBhZ2UsIDEwKSB8fCAxO1xuICAgIGNvbnN0IHRvdGFsID0gaXRlbXMubGVuZ3RoO1xuICAgIGNvbnN0IHBhZ2VkID0gaXRlbXMuc2xpY2UoKHBhZ2VOdW0gLSAxKSAqIHBhZ2VTaXplLCBwYWdlTnVtICogcGFnZVNpemUpO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBpdGVtczogcGFnZWQsIHRvdGFsIH0pO1xuICB9XG5cbiAgaWYgKHBhdGggPT09ICcvYXBpL3N1ZmZpeC1zZXR0aW5ncycgJiYgbWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICBpZiAoIWNoZWNrUGVybWlzc2lvbignc2V0dGluZ3M6dXBkYXRlJykpIHJldHVybjtcbiAgICBjb25zdCBpdGVtcyA9IGF3YWl0IGxvYWRTdWZmaXhlcygpO1xuICAgIGNvbnN0IHN1ZmZpeCA9IHtcbiAgICAgIC4uLnBhcnNlZCxcbiAgICAgIGlkOiBjcnlwdG8ucmFuZG9tVVVJRCA/IGNyeXB0by5yYW5kb21VVUlEKCkgOiBEYXRlLm5vdygpLnRvU3RyaW5nKDM2KSArIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIpLFxuICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgfTtcbiAgICBpZiAoc3VmZml4LmlzRGVmYXVsdCkgaXRlbXMuZm9yRWFjaChwID0+IHsgcC5pc0RlZmF1bHQgPSBmYWxzZTsgfSk7XG4gICAgaXRlbXMucHVzaChzdWZmaXgpO1xuICAgIGF3YWl0IHNhdmVTdWZmaXhlcyhpdGVtcyk7XG4gICAgcmV0dXJuIHNlbmQoMjAxLCB7IHN1ZmZpeCB9KTtcbiAgfVxuXG4gIGNvbnN0IHNzTWF0Y2ggPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvc3VmZml4LXNldHRpbmdzXFwvKFteL10rKSQvKTtcbiAgaWYgKHNzTWF0Y2gpIHtcbiAgICBjb25zdCBpZCA9IHNzTWF0Y2hbMV07XG4gICAgaWYgKG1ldGhvZCA9PT0gJ1BVVCcpIHtcbiAgICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdzZXR0aW5nczp1cGRhdGUnKSkgcmV0dXJuO1xuICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBsb2FkU3VmZml4ZXMoKTtcbiAgICAgIGNvbnN0IGlkeCA9IGl0ZW1zLmZpbmRJbmRleChwID0+IHAuaWQgPT09IGlkKTtcbiAgICAgIGlmIChpZHggPT09IC0xKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdTdWZmaXggbm90IGZvdW5kLicgfSk7XG4gICAgICBpZiAocGFyc2VkLmlzRGVmYXVsdCkgaXRlbXMuZm9yRWFjaChwID0+IHsgcC5pc0RlZmF1bHQgPSBmYWxzZTsgfSk7XG4gICAgICBpdGVtc1tpZHhdID0geyAuLi5pdGVtc1tpZHhdLCAuLi5wYXJzZWQsIGlkIH07XG4gICAgICBhd2FpdCBzYXZlU3VmZml4ZXMoaXRlbXMpO1xuICAgICAgcmV0dXJuIHNlbmQoMjAwLCB7IHN1ZmZpeDogaXRlbXNbaWR4XSB9KTtcbiAgICB9XG4gICAgaWYgKG1ldGhvZCA9PT0gJ0RFTEVURScpIHtcbiAgICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdzZXR0aW5nczpkZWxldGUnKSkgcmV0dXJuO1xuICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBsb2FkU3VmZml4ZXMoKTtcbiAgICAgIGNvbnN0IGlkeCA9IGl0ZW1zLmZpbmRJbmRleChwID0+IHAuaWQgPT09IGlkKTtcbiAgICAgIGlmIChpZHggPT09IC0xKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdTdWZmaXggbm90IGZvdW5kLicgfSk7XG4gICAgICBpdGVtcy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgIGF3YWl0IHNhdmVTdWZmaXhlcyhpdGVtcyk7XG4gICAgICByZXR1cm4gc2VuZCgyMDAsIHsgb2s6IHRydWUgfSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3Qgc3NEZWZhdWx0TWF0Y2ggPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvc3VmZml4LXNldHRpbmdzXFwvKFteL10rKVxcL2RlZmF1bHQkLyk7XG4gIGlmIChzc0RlZmF1bHRNYXRjaCkge1xuICAgIGlmIChtZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgaWYgKCFjaGVja1Blcm1pc3Npb24oJ3NldHRpbmdzOnVwZGF0ZScpKSByZXR1cm47XG4gICAgICBjb25zdCBpZCA9IHNzRGVmYXVsdE1hdGNoWzFdO1xuICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBsb2FkU3VmZml4ZXMoKTtcbiAgICAgIGNvbnN0IGlkeCA9IGl0ZW1zLmZpbmRJbmRleChwID0+IHAuaWQgPT09IGlkKTtcbiAgICAgIGlmIChpZHggPT09IC0xKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdTdWZmaXggbm90IGZvdW5kLicgfSk7XG4gICAgICBpdGVtcy5mb3JFYWNoKHAgPT4geyBwLmlzRGVmYXVsdCA9IGZhbHNlOyB9KTtcbiAgICAgIGl0ZW1zW2lkeF0uaXNEZWZhdWx0ID0gdHJ1ZTtcbiAgICAgIGF3YWl0IHNhdmVTdWZmaXhlcyhpdGVtcyk7XG4gICAgICByZXR1cm4gc2VuZCgyMDAsIHsgc3VmZml4OiBpdGVtc1tpZHhdIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vID09PT09IERvY3VtZW50IE5vdGVzID09PT09XG4gIGNvbnN0IE5PVEVTX1NUT1JFX0tFWSA9ICdfZG9jdW1lbnRfbm90ZXMnO1xuICBhc3luYyBmdW5jdGlvbiBsb2FkTm90ZXMoKSB7XG4gICAgaWYgKGRiLnNldHRpbmdzKSB7XG4gICAgICBjb25zdCBhbGwgPSBhd2FpdCBkYi5zZXR0aW5ncy5nZXRBbGwoKTtcbiAgICAgIGNvbnN0IHJhdyA9IGFsbFtOT1RFU19TVE9SRV9LRVldO1xuICAgICAgaWYgKHJhdykgeyB0cnkgeyByZXR1cm4gdHlwZW9mIHJhdyA9PT0gJ3N0cmluZycgPyBKU09OLnBhcnNlKHJhdykgOiByYXc7IH0gY2F0Y2gge30gfVxuICAgIH1cbiAgICByZXR1cm4gW107XG4gIH1cbiAgYXN5bmMgZnVuY3Rpb24gc2F2ZU5vdGVzKGl0ZW1zKSB7XG4gICAgaWYgKGRiLnNldHRpbmdzKSB7IGF3YWl0IGRiLnNldHRpbmdzLnVwZGF0ZSh7IFtOT1RFU19TVE9SRV9LRVldOiBKU09OLnN0cmluZ2lmeShpdGVtcykgfSk7IH1cbiAgfVxuXG4gIGlmIChwYXRoID09PSAnL2FwaS9kb2N1bWVudC1ub3RlcycgJiYgbWV0aG9kID09PSAnR0VUJykge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdzZXR0aW5nczpyZWFkJykpIHJldHVybjtcbiAgICBsZXQgaXRlbXMgPSBhd2FpdCBsb2FkTm90ZXMoKTtcbiAgICBpZiAocGFyc2VkLmRvY1R5cGUpIGl0ZW1zID0gaXRlbXMuZmlsdGVyKG4gPT4gbi5kb2NUeXBlID09PSBwYXJzZWQuZG9jVHlwZSk7XG4gICAgaWYgKHBhcnNlZC5xKSB7XG4gICAgICBjb25zdCBxID0gcGFyc2VkLnEudG9Mb3dlckNhc2UoKTtcbiAgICAgIGl0ZW1zID0gaXRlbXMuZmlsdGVyKG4gPT4gKG4uY29udGVudCB8fCAnJykudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxKSB8fCAobi50aXRsZSB8fCAnJykudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxKSk7XG4gICAgfVxuICAgIGNvbnN0IHNvcnRGaWVsZCA9IHBhcnNlZC5zb3J0RmllbGQgfHwgJ2NyZWF0ZWRBdCc7XG4gICAgY29uc3Qgc29ydERpciA9IHBhcnNlZC5zb3J0RGlyIHx8ICdkZXNjJztcbiAgICBpdGVtcyA9IFsuLi5pdGVtc10uc29ydCgoYSwgYikgPT4ge1xuICAgICAgY29uc3QgdmEgPSBhW3NvcnRGaWVsZF0gPz8gMDtcbiAgICAgIGNvbnN0IHZiID0gYltzb3J0RmllbGRdID8/IDA7XG4gICAgICBpZiAodHlwZW9mIHZhID09PSAnc3RyaW5nJykgcmV0dXJuIHNvcnREaXIgPT09ICdkZXNjJyA/IHZiLmxvY2FsZUNvbXBhcmUodmEpIDogdmEubG9jYWxlQ29tcGFyZSh2Yik7XG4gICAgICByZXR1cm4gc29ydERpciA9PT0gJ2Rlc2MnID8gdmIgLSB2YSA6IHZhIC0gdmI7XG4gICAgfSk7XG4gICAgY29uc3QgcGFnZVNpemUgPSBwYXJzZUludChwYXJzZWQucGFnZVNpemUsIDEwKSB8fCAxMDtcbiAgICBjb25zdCBwYWdlTnVtID0gcGFyc2VJbnQocGFyc2VkLnBhZ2UsIDEwKSB8fCAxO1xuICAgIGNvbnN0IHRvdGFsID0gaXRlbXMubGVuZ3RoO1xuICAgIGNvbnN0IHBhZ2VkID0gaXRlbXMuc2xpY2UoKHBhZ2VOdW0gLSAxKSAqIHBhZ2VTaXplLCBwYWdlTnVtICogcGFnZVNpemUpO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBpdGVtczogcGFnZWQsIHRvdGFsIH0pO1xuICB9XG5cbiAgaWYgKHBhdGggPT09ICcvYXBpL2RvY3VtZW50LW5vdGVzJyAmJiBtZXRob2QgPT09ICdQT1NUJykge1xuICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdzZXR0aW5nczp1cGRhdGUnKSkgcmV0dXJuO1xuICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgbG9hZE5vdGVzKCk7XG4gICAgY29uc3Qgbm90ZSA9IHsgLi4ucGFyc2VkLCBpZDogY3J5cHRvLnJhbmRvbVVVSUQgPyBjcnlwdG8ucmFuZG9tVVVJRCgpIDogRGF0ZS5ub3coKS50b1N0cmluZygzNikgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKSwgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgfTtcbiAgICBpdGVtcy5wdXNoKG5vdGUpO1xuICAgIGF3YWl0IHNhdmVOb3RlcyhpdGVtcyk7XG4gICAgcmV0dXJuIHNlbmQoMjAxLCB7IG5vdGUgfSk7XG4gIH1cblxuICBjb25zdCBub3RlTWF0Y2ggPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvZG9jdW1lbnQtbm90ZXNcXC8oW14vXSspJC8pO1xuICBpZiAobm90ZU1hdGNoKSB7XG4gICAgY29uc3QgaWQgPSBub3RlTWF0Y2hbMV07XG4gICAgaWYgKG1ldGhvZCA9PT0gJ1BVVCcpIHtcbiAgICAgIGlmICghY2hlY2tQZXJtaXNzaW9uKCdzZXR0aW5nczp1cGRhdGUnKSkgcmV0dXJuO1xuICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBsb2FkTm90ZXMoKTtcbiAgICAgIGNvbnN0IGlkeCA9IGl0ZW1zLmZpbmRJbmRleChuID0+IG4uaWQgPT09IGlkKTtcbiAgICAgIGlmIChpZHggPT09IC0xKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdOb3RlIG5vdCBmb3VuZC4nIH0pO1xuICAgICAgaXRlbXNbaWR4XSA9IHsgLi4uaXRlbXNbaWR4XSwgLi4ucGFyc2VkLCBpZCB9O1xuICAgICAgYXdhaXQgc2F2ZU5vdGVzKGl0ZW1zKTtcbiAgICAgIHJldHVybiBzZW5kKDIwMCwgeyBub3RlOiBpdGVtc1tpZHhdIH0pO1xuICAgIH1cbiAgICBpZiAobWV0aG9kID09PSAnREVMRVRFJykge1xuICAgICAgaWYgKCFjaGVja1Blcm1pc3Npb24oJ3NldHRpbmdzOmRlbGV0ZScpKSByZXR1cm47XG4gICAgICBjb25zdCBpdGVtcyA9IGF3YWl0IGxvYWROb3RlcygpO1xuICAgICAgY29uc3QgaWR4ID0gaXRlbXMuZmluZEluZGV4KG4gPT4gbi5pZCA9PT0gaWQpO1xuICAgICAgaWYgKGlkeCA9PT0gLTEpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ05vdGUgbm90IGZvdW5kLicgfSk7XG4gICAgICBpdGVtcy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgIGF3YWl0IHNhdmVOb3RlcyhpdGVtcyk7XG4gICAgICByZXR1cm4gc2VuZCgyMDAsIHsgb2s6IHRydWUgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gPT09PT0gRG9jdW1lbnQgVGVybXMgPT09PT1cbiAgY29uc3QgVEVSTVNfU1RPUkVfS0VZID0gJ19kb2N1bWVudF90ZXJtcyc7XG4gIGFzeW5jIGZ1bmN0aW9uIGxvYWRUZXJtcygpIHtcbiAgICBpZiAoZGIuc2V0dGluZ3MpIHtcbiAgICAgIGNvbnN0IGFsbCA9IGF3YWl0IGRiLnNldHRpbmdzLmdldEFsbCgpO1xuICAgICAgY29uc3QgcmF3ID0gYWxsW1RFUk1TX1NUT1JFX0tFWV07XG4gICAgICBpZiAocmF3KSB7IHRyeSB7IHJldHVybiB0eXBlb2YgcmF3ID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2UocmF3KSA6IHJhdzsgfSBjYXRjaCB7fSB9XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfVxuICBhc3luYyBmdW5jdGlvbiBzYXZlVGVybXMoaXRlbXMpIHtcbiAgICBpZiAoZGIuc2V0dGluZ3MpIHsgYXdhaXQgZGIuc2V0dGluZ3MudXBkYXRlKHsgW1RFUk1TX1NUT1JFX0tFWV06IEpTT04uc3RyaW5naWZ5KGl0ZW1zKSB9KTsgfVxuICB9XG5cbiAgaWYgKHBhdGggPT09ICcvYXBpL2RvY3VtZW50LXRlcm1zJyAmJiBtZXRob2QgPT09ICdHRVQnKSB7XG4gICAgaWYgKCFjaGVja1Blcm1pc3Npb24oJ3NldHRpbmdzOnJlYWQnKSkgcmV0dXJuO1xuICAgIGxldCBpdGVtcyA9IGF3YWl0IGxvYWRUZXJtcygpO1xuICAgIGlmIChwYXJzZWQuZG9jVHlwZSkgaXRlbXMgPSBpdGVtcy5maWx0ZXIodCA9PiB0LmRvY1R5cGUgPT09IHBhcnNlZC5kb2NUeXBlKTtcbiAgICBpZiAocGFyc2VkLnEpIHtcbiAgICAgIGNvbnN0IHEgPSBwYXJzZWQucS50b0xvd2VyQ2FzZSgpO1xuICAgICAgaXRlbXMgPSBpdGVtcy5maWx0ZXIodCA9PiAodC5jb250ZW50IHx8ICcnKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHEpIHx8ICh0LnRpdGxlIHx8ICcnKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHEpKTtcbiAgICB9XG4gICAgY29uc3Qgc29ydEZpZWxkID0gcGFyc2VkLnNvcnRGaWVsZCB8fCAnY3JlYXRlZEF0JztcbiAgICBjb25zdCBzb3J0RGlyID0gcGFyc2VkLnNvcnREaXIgfHwgJ2Rlc2MnO1xuICAgIGl0ZW1zID0gWy4uLml0ZW1zXS5zb3J0KChhLCBiKSA9PiB7XG4gICAgICBjb25zdCB2YSA9IGFbc29ydEZpZWxkXSA/PyAwO1xuICAgICAgY29uc3QgdmIgPSBiW3NvcnRGaWVsZF0gPz8gMDtcbiAgICAgIGlmICh0eXBlb2YgdmEgPT09ICdzdHJpbmcnKSByZXR1cm4gc29ydERpciA9PT0gJ2Rlc2MnID8gdmIubG9jYWxlQ29tcGFyZSh2YSkgOiB2YS5sb2NhbGVDb21wYXJlKHZiKTtcbiAgICAgIHJldHVybiBzb3J0RGlyID09PSAnZGVzYycgPyB2YiAtIHZhIDogdmEgLSB2YjtcbiAgICB9KTtcbiAgICBjb25zdCBwYWdlU2l6ZSA9IHBhcnNlSW50KHBhcnNlZC5wYWdlU2l6ZSwgMTApIHx8IDEwO1xuICAgIGNvbnN0IHBhZ2VOdW0gPSBwYXJzZUludChwYXJzZWQucGFnZSwgMTApIHx8IDE7XG4gICAgY29uc3QgdG90YWwgPSBpdGVtcy5sZW5ndGg7XG4gICAgY29uc3QgcGFnZWQgPSBpdGVtcy5zbGljZSgocGFnZU51bSAtIDEpICogcGFnZVNpemUsIHBhZ2VOdW0gKiBwYWdlU2l6ZSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IGl0ZW1zOiBwYWdlZCwgdG90YWwgfSk7XG4gIH1cblxuICBpZiAocGF0aCA9PT0gJy9hcGkvZG9jdW1lbnQtdGVybXMnICYmIG1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgaWYgKCFjaGVja1Blcm1pc3Npb24oJ3NldHRpbmdzOnVwZGF0ZScpKSByZXR1cm47XG4gICAgY29uc3QgaXRlbXMgPSBhd2FpdCBsb2FkVGVybXMoKTtcbiAgICBjb25zdCB0ZXJtID0geyAuLi5wYXJzZWQsIGlkOiBjcnlwdG8ucmFuZG9tVVVJRCA/IGNyeXB0by5yYW5kb21VVUlEKCkgOiBEYXRlLm5vdygpLnRvU3RyaW5nKDM2KSArIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIpLCBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSB9O1xuICAgIGl0ZW1zLnB1c2godGVybSk7XG4gICAgYXdhaXQgc2F2ZVRlcm1zKGl0ZW1zKTtcbiAgICByZXR1cm4gc2VuZCgyMDEsIHsgdGVybSB9KTtcbiAgfVxuXG4gIGNvbnN0IHRlcm1NYXRjaCA9IHBhdGgubWF0Y2goL15cXC9hcGlcXC9kb2N1bWVudC10ZXJtc1xcLyhbXi9dKykkLyk7XG4gIGlmICh0ZXJtTWF0Y2gpIHtcbiAgICBjb25zdCBpZCA9IHRlcm1NYXRjaFsxXTtcbiAgICBpZiAobWV0aG9kID09PSAnUFVUJykge1xuICAgICAgaWYgKCFjaGVja1Blcm1pc3Npb24oJ3NldHRpbmdzOnVwZGF0ZScpKSByZXR1cm47XG4gICAgICBjb25zdCBpdGVtcyA9IGF3YWl0IGxvYWRUZXJtcygpO1xuICAgICAgY29uc3QgaWR4ID0gaXRlbXMuZmluZEluZGV4KHQgPT4gdC5pZCA9PT0gaWQpO1xuICAgICAgaWYgKGlkeCA9PT0gLTEpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ1Rlcm0gbm90IGZvdW5kLicgfSk7XG4gICAgICBpdGVtc1tpZHhdID0geyAuLi5pdGVtc1tpZHhdLCAuLi5wYXJzZWQsIGlkIH07XG4gICAgICBhd2FpdCBzYXZlVGVybXMoaXRlbXMpO1xuICAgICAgcmV0dXJuIHNlbmQoMjAwLCB7IHRlcm06IGl0ZW1zW2lkeF0gfSk7XG4gICAgfVxuICAgIGlmIChtZXRob2QgPT09ICdERUxFVEUnKSB7XG4gICAgICBpZiAoIWNoZWNrUGVybWlzc2lvbignc2V0dGluZ3M6ZGVsZXRlJykpIHJldHVybjtcbiAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgbG9hZFRlcm1zKCk7XG4gICAgICBjb25zdCBpZHggPSBpdGVtcy5maW5kSW5kZXgodCA9PiB0LmlkID09PSBpZCk7XG4gICAgICBpZiAoaWR4ID09PSAtMSkgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnVGVybSBub3QgZm91bmQuJyB9KTtcbiAgICAgIGl0ZW1zLnNwbGljZShpZHgsIDEpO1xuICAgICAgYXdhaXQgc2F2ZVRlcm1zKGl0ZW1zKTtcbiAgICAgIHJldHVybiBzZW5kKDIwMCwgeyBvazogdHJ1ZSB9KTtcbiAgICB9XG4gIH1cblxuICAvLyA9PT09PSBQcm9kdWN0IENvbHVtbnMgPT09PT1cbiAgY29uc3QgQ09MVU1OU19TVE9SRV9LRVkgPSAnX3Byb2R1Y3RfY29sdW1ucyc7XG4gIGFzeW5jIGZ1bmN0aW9uIGxvYWRDb2x1bW5zKCkge1xuICAgIGlmIChkYi5zZXR0aW5ncykge1xuICAgICAgY29uc3QgYWxsID0gYXdhaXQgZGIuc2V0dGluZ3MuZ2V0QWxsKCk7XG4gICAgICBjb25zdCByYXcgPSBhbGxbQ09MVU1OU19TVE9SRV9LRVldO1xuICAgICAgaWYgKHJhdykgeyB0cnkgeyByZXR1cm4gdHlwZW9mIHJhdyA9PT0gJ3N0cmluZycgPyBKU09OLnBhcnNlKHJhdykgOiByYXc7IH0gY2F0Y2gge30gfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGlmIChwYXRoID09PSAnL2FwaS9wcm9kdWN0LWNvbHVtbnMnICYmIG1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICBjb25zdCBjb2x1bW5zID0gYXdhaXQgbG9hZENvbHVtbnMoKTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgY29sdW1uczogQXJyYXkuaXNBcnJheShjb2x1bW5zKSA/IGNvbHVtbnMgOiBbXSB9KTtcbiAgfVxuXG4gIGlmIChwYXRoID09PSAnL2FwaS9wcm9kdWN0LWNvbHVtbnMnICYmIG1ldGhvZCA9PT0gJ1BVVCcpIHtcbiAgICBpZiAoIWNoZWNrUGVybWlzc2lvbignc2V0dGluZ3M6dXBkYXRlJykpIHJldHVybjtcbiAgICBpZiAoZGIuc2V0dGluZ3MpIHsgYXdhaXQgZGIuc2V0dGluZ3MudXBkYXRlKHsgW0NPTFVNTlNfU1RPUkVfS0VZXTogSlNPTi5zdHJpbmdpZnkocGFyc2VkLmNvbHVtbnMgfHwgW10pIH0pOyB9XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IG9rOiB0cnVlIH0pO1xuICB9XG5cbiAgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnTm90IGZvdW5kLicgfSk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gSW52b2ljZSBkb21haW4gXHUyMDE0IG1lbW9yeSBwcm92aWRlci4gTWlycm9ycyB0aGUgU3VwYWJhc2UgaGFuZGxlcnMgYmVsb3cgc28gdGhlXG4vLyBwYWdlIGlzIHByb3ZpZGVyLWFnbm9zdGljLiBFYWNoIGhhbmRsZXIgZW5mb3JjZXMgdGhlIGNlbnRyYWxpemVkIHBlcm1pc3Npb25cbi8vIGNvbnN0YW50cyBzZXJ2ZXItc2lkZSAoZGVmZW5zZSBpbiBkZXB0aCBvbiB0b3Agb2YgY2xpZW50IFBlcm1pc3Npb25HYXRlKS5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlSW52b2ljZU1lbW9yeShkYiwgcGF0aCwgbWV0aG9kLCBwYXJzZWQsIHNlbmQsIGN1cnJlbnRVc2VyKSB7XG4gIGNvbnN0IFBFUk0gPSB7XG4gICAgQ1VTVE9NRVJfUkVBRDogJ2N1c3RvbWVyOnJlYWQnLCBDVVNUT01FUl9DUkVBVEU6ICdjdXN0b21lcjpjcmVhdGUnLCBDVVNUT01FUl9VUERBVEU6ICdjdXN0b21lcjp1cGRhdGUnLFxuICAgIFBST0RVQ1RfUkVBRDogJ3Byb2R1Y3Q6cmVhZCcsIFBST0RVQ1RfQ1JFQVRFOiAncHJvZHVjdDpjcmVhdGUnLCBQUk9EVUNUX1VQREFURTogJ3Byb2R1Y3Q6dXBkYXRlJyxcbiAgICBJTlZPSUNFX1JFQUQ6ICdpbnZvaWNlOnJlYWQnLCBJTlZPSUNFX0NSRUFURTogJ2ludm9pY2U6Y3JlYXRlJywgSU5WT0lDRV9VUERBVEU6ICdpbnZvaWNlOnVwZGF0ZScsIElOVk9JQ0VfREVMRVRFOiAnaW52b2ljZTpkZWxldGUnLFxuICB9O1xuICBjb25zdCBjcCA9IChwZXJtKSA9PiB7XG4gICAgaWYgKCFjdXJyZW50VXNlcikgeyBzZW5kKDQwMSwgeyBlcnJvcjogJ0F1dGhlbnRpY2F0aW9uIHJlcXVpcmVkLicgfSk7IHJldHVybiBmYWxzZTsgfVxuICAgIGlmICghY3VycmVudFVzZXIucGVybWlzc2lvbnM/LmluY2x1ZGVzKHBlcm0pICYmICFjdXJyZW50VXNlci5wZXJtaXNzaW9ucz8uaW5jbHVkZXMoJyonKSAmJiAhY3VycmVudFVzZXIuZnVsbF9hY2Nlc3MpIHtcbiAgICAgIHNlbmQoNDAzLCB7IGVycm9yOiAnRm9yYmlkZGVuLicgfSk7IHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gRG9jdW1lbnQgdHlwZXMgXHUyMDE0IHJldHVybiB0aGUgZGVmYXVsdCBzZXQuIEluIHByb2R1Y3Rpb24gKFN1cGFiYXNlKSB0aGVzZVxuICAvLyBhcmUgbWFuYWdlZCB0aHJvdWdoIHRoZSBkb2N1bWVudF90eXBlX21hc3RlciB0YWJsZS5cbiAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aCA9PT0gJy9hcGkvZG9jdW1lbnQtdHlwZXMnKSB7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHR5cGVzOiBbJ0ludm9pY2UnLCAnUHVyY2hhc2UnLCAnU2FsZXMgUmV0dXJuJywgJ1B1cmNoYXNlIFJldHVybicsICdQdXJjaGFzZSBPcmRlcicsICdEZWxpdmVyeSBDaGFsbGFuJywgJ1NhbGVzIE9yZGVyJywgJ1F1b3RhdGlvbicsICdQcm8gRm9ybWEgSW52b2ljZScsICdTdWJzY3JpcHRpb24nLCAnU2FsZXMgRGViaXQgTm90ZSddIH0pO1xuICB9XG5cbiAgLy8gQ3VzdG9tIGhlYWRlcnMgXHUyMDE0IHBlcnNpc3RlZCB2aWEgc2V0dGluZ3MgaW4gbWVtb3J5IG1vZGUuXG4gIGlmIChwYXRoID09PSAnL2FwaS9jdXN0b20taGVhZGVycycgfHwgcGF0aC5zdGFydHNXaXRoKCcvYXBpL2N1c3RvbS1oZWFkZXJzLycpKSB7XG4gICAgY29uc3QgSEVBREVSX1NUT1JFX0tFWSA9ICdfY3VzdG9tX2hlYWRlcnMnO1xuICAgIGNvbnN0IGxvYWRIZWFkZXJzID0gYXN5bmMgKCkgPT4ge1xuICAgICAgaWYgKGRiLnNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IGFsbCA9IGF3YWl0IGRiLnNldHRpbmdzLmdldEFsbCgpO1xuICAgICAgICBjb25zdCByYXcgPSBhbGxbSEVBREVSX1NUT1JFX0tFWV07XG4gICAgICAgIGlmIChyYXcpIHtcbiAgICAgICAgICB0cnkgeyByZXR1cm4gdHlwZW9mIHJhdyA9PT0gJ3N0cmluZycgPyBKU09OLnBhcnNlKHJhdykgOiByYXc7IH0gY2F0Y2gge31cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIFtdO1xuICAgIH07XG4gICAgY29uc3Qgc2F2ZUhlYWRlcnMgPSBhc3luYyAoaXRlbXMpID0+IHtcbiAgICAgIGlmIChkYi5zZXR0aW5ncykge1xuICAgICAgICBhd2FpdCBkYi5zZXR0aW5ncy51cGRhdGUoeyBbSEVBREVSX1NUT1JFX0tFWV06IEpTT04uc3RyaW5naWZ5KGl0ZW1zKSB9KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgIGlmICghY3AoJ3NldHRpbmdzOnJlYWQnKSkgcmV0dXJuIHRydWU7XG4gICAgICBsZXQgaXRlbXMgPSBhd2FpdCBsb2FkSGVhZGVycygpO1xuICAgICAgLy8gQXBwbHkgZmlsdGVyc1xuICAgICAgaWYgKHBhcnNlZC5hY3RpdmUgPT09ICd0cnVlJykgaXRlbXMgPSBpdGVtcy5maWx0ZXIoaCA9PiBoLmFjdGl2ZSAhPT0gZmFsc2UpO1xuICAgICAgaWYgKHBhcnNlZC52aXNpYmxlID09PSAndHJ1ZScpIGl0ZW1zID0gaXRlbXMuZmlsdGVyKGggPT4gaC52aXNpYmxlICE9PSBmYWxzZSk7XG4gICAgICBpZiAocGFyc2VkLmRvY1R5cGUpIGl0ZW1zID0gaXRlbXMuZmlsdGVyKGggPT4gIWguZG9jVHlwZXMgfHwgIWguZG9jVHlwZXMubGVuZ3RoIHx8IGguZG9jVHlwZXMuaW5jbHVkZXMocGFyc2VkLmRvY1R5cGUpKTtcbiAgICAgIGNvbnN0IHNvcnRGaWVsZCA9IHBhcnNlZC5zb3J0RmllbGQgfHwgJ2Rpc3BsYXlPcmRlcic7XG4gICAgICBjb25zdCBzb3J0RGlyID0gcGFyc2VkLnNvcnREaXIgfHwgJ2FzYyc7XG4gICAgICBpdGVtcyA9IFsuLi5pdGVtc10uc29ydCgoYSwgYikgPT4ge1xuICAgICAgICBjb25zdCB2YSA9IGFbc29ydEZpZWxkXSA/PyAwO1xuICAgICAgICBjb25zdCB2YiA9IGJbc29ydEZpZWxkXSA/PyAwO1xuICAgICAgICByZXR1cm4gc29ydERpciA9PT0gJ2Rlc2MnID8gdmIgLSB2YSA6IHZhIC0gdmI7XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHBhZ2VTaXplID0gcGFyc2VJbnQocGFyc2VkLnBhZ2VTaXplLCAxMCkgfHwgMjAwO1xuICAgICAgY29uc3QgcGFnZSA9IHBhcnNlSW50KHBhcnNlZC5wYWdlLCAxMCkgfHwgMTtcbiAgICAgIGNvbnN0IHRvdGFsID0gaXRlbXMubGVuZ3RoO1xuICAgICAgY29uc3QgcGFnZWQgPSBpdGVtcy5zbGljZSgocGFnZSAtIDEpICogcGFnZVNpemUsIHBhZ2UgKiBwYWdlU2l6ZSk7XG4gICAgICByZXR1cm4gc2VuZCgyMDAsIHsgaXRlbXM6IHBhZ2VkLCB0b3RhbCB9KTtcbiAgICB9XG5cbiAgICBpZiAobWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICAgIGlmICghY3AoJ3NldHRpbmdzOnVwZGF0ZScpKSByZXR1cm4gdHJ1ZTtcbiAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgbG9hZEhlYWRlcnMoKTtcbiAgICAgIGNvbnN0IGhlYWRlciA9IHtcbiAgICAgICAgLi4ucGFyc2VkLFxuICAgICAgICBpZDogcGFyc2VkLmlkIHx8IGNyeXB0by5yYW5kb21VVUlEID8gY3J5cHRvLnJhbmRvbVVVSUQoKSA6IERhdGUubm93KCkudG9TdHJpbmcoMzYpICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMiksXG4gICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgfTtcbiAgICAgIGl0ZW1zLnB1c2goaGVhZGVyKTtcbiAgICAgIGF3YWl0IHNhdmVIZWFkZXJzKGl0ZW1zKTtcbiAgICAgIHJldHVybiBzZW5kKDIwMSwgeyBoZWFkZXIgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgaWRNYXRjaCA9IHBhdGgubWF0Y2goL15cXC9hcGlcXC9jdXN0b20taGVhZGVyc1xcLyguKykkLyk7XG4gICAgaWYgKGlkTWF0Y2gpIHtcbiAgICAgIGNvbnN0IGlkID0gaWRNYXRjaFsxXTtcbiAgICAgIGlmIChtZXRob2QgPT09ICdQVVQnKSB7XG4gICAgICAgIGlmICghY3AoJ3NldHRpbmdzOnVwZGF0ZScpKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBsb2FkSGVhZGVycygpO1xuICAgICAgICBjb25zdCBpZHggPSBpdGVtcy5maW5kSW5kZXgoaCA9PiBoLmlkID09PSBpZCk7XG4gICAgICAgIGlmIChpZHggPT09IC0xKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdDdXN0b20gaGVhZGVyIG5vdCBmb3VuZC4nIH0pO1xuICAgICAgICBpdGVtc1tpZHhdID0geyAuLi5pdGVtc1tpZHhdLCAuLi5wYXJzZWQsIGlkIH07XG4gICAgICAgIGF3YWl0IHNhdmVIZWFkZXJzKGl0ZW1zKTtcbiAgICAgICAgcmV0dXJuIHNlbmQoMjAwLCB7IGhlYWRlcjogaXRlbXNbaWR4XSB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChtZXRob2QgPT09ICdERUxFVEUnKSB7XG4gICAgICAgIGlmICghY3AoJ3NldHRpbmdzOmRlbGV0ZScpKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBsb2FkSGVhZGVycygpO1xuICAgICAgICBjb25zdCBpZHggPSBpdGVtcy5maW5kSW5kZXgoaCA9PiBoLmlkID09PSBpZCk7XG4gICAgICAgIGlmIChpZHggPT09IC0xKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdDdXN0b20gaGVhZGVyIG5vdCBmb3VuZC4nIH0pO1xuICAgICAgICBpdGVtcy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgYXdhaXQgc2F2ZUhlYWRlcnMoaXRlbXMpO1xuICAgICAgICByZXR1cm4gc2VuZCgyMDAsIHsgb2s6IHRydWUgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ05vdCBmb3VuZC4nIH0pO1xuICB9XG5cbiAgLy8gRG9lcyB0aGlzIHJlcXVlc3QgYmVsb25nIHRvIHRoZSBpbnZvaWNlIGRvbWFpbiBhdCBhbGw/IElmIG5vdCwgcmV0dXJuXG4gIC8vIGZhbHNlIHNvIHRoZSBkaXNwYXRjaGVyIGZhbGxzIHRocm91Z2ggdG8gdGhlIGdlbmVyaWMgbWVtb3J5IGhhbmRsZXJzLlxuICBjb25zdCBpc0N1c3RvbWVyID0gcGF0aCA9PT0gJy9hcGkvY3VzdG9tZXJzJyB8fCBwYXRoLnN0YXJ0c1dpdGgoJy9hcGkvY3VzdG9tZXJzLycpO1xuICBjb25zdCBpc1Byb2R1Y3QgPSBwYXRoID09PSAnL2FwaS9wcm9kdWN0cycgfHwgcGF0aC5zdGFydHNXaXRoKCcvYXBpL3Byb2R1Y3RzLycpO1xuICBjb25zdCBpc0JhbmsgPSBwYXRoID09PSAnL2FwaS9iYW5rcycgfHwgcGF0aC5zdGFydHNXaXRoKCcvYXBpL2JhbmtzLycpO1xuICBjb25zdCBpc1NpZ25hdHVyZSA9IHBhdGggPT09ICcvYXBpL3NpZ25hdHVyZXMnIHx8IHBhdGguc3RhcnRzV2l0aCgnL2FwaS9zaWduYXR1cmVzLycpO1xuICBjb25zdCBpc0ludm9pY2UgPSBwYXRoID09PSAnL2FwaS9pbnZvaWNlcycgfHwgcGF0aC5zdGFydHNXaXRoKCcvYXBpL2ludm9pY2VzLycpO1xuICBpZiAoIWlzQ3VzdG9tZXIgJiYgIWlzUHJvZHVjdCAmJiAhaXNCYW5rICYmICFpc1NpZ25hdHVyZSAmJiAhaXNJbnZvaWNlKSByZXR1cm4gZmFsc2U7XG5cbiAgLy8gUmVwb3NpdG9yaWVzIGFyZSBvcHRpb25hbCBpbiB0aGUgbWVtb3J5IHByb3ZpZGVyOyBpZiB0aGUgZG9tYWluIHN0b3JlXG4gIC8vIGlzbid0IHdpcmVkIChlLmcuIHJ1bm5pbmcgcHVyZWx5IGFnYWluc3QgU3VwYWJhc2UpLCBzaWduYWwgbm90LWZvdW5kXG4gIC8vIHJhdGhlciB0aGFuIGNyYXNoaW5nIG9uIHVuZGVmaW5lZCBtZXRob2QgY2FsbHMuXG4gIGNvbnN0IGhhdmUgPSBkYi5jdXN0b21lcnMgJiYgZGIucHJvZHVjdHMgJiYgZGIucHJvZHVjdENhdGVnb3JpZXMgJiYgZGIuYmFua3MgJiYgZGIuc2lnbmF0dXJlcyAmJiBkYi5pbnZvaWNlcztcbiAgaWYgKCFoYXZlKSB7IHNlbmQoNDA0LCB7IGVycm9yOiAnSW52b2ljZSBkb21haW4gbm90IGF2YWlsYWJsZSBvbiB0aGlzIHByb3ZpZGVyLicgfSk7IHJldHVybiB0cnVlOyB9XG5cbiAgaWYgKHBhdGggPT09ICcvYXBpL2N1c3RvbWVycycgJiYgbWV0aG9kID09PSAnR0VUJykge1xuICAgIGlmICghY3AoUEVSTS5DVVNUT01FUl9SRUFEKSkgcmV0dXJuIHRydWU7XG4gICAgc2VuZCgyMDAsIHsgY3VzdG9tZXJzOiAoYXdhaXQgZGIuY3VzdG9tZXJzLmZpbmRBbGwoY3VycmVudFVzZXIpKS5maWx0ZXIoQm9vbGVhbikgfSk7XG4gIH0gZWxzZSBpZiAocGF0aCA9PT0gJy9hcGkvY3VzdG9tZXJzJyAmJiBtZXRob2QgPT09ICdQT1NUJykge1xuICAgIGlmICghY3AoUEVSTS5DVVNUT01FUl9DUkVBVEUpKSByZXR1cm4gdHJ1ZTtcbiAgICBzZW5kKDIwMSwgeyBjdXN0b21lcjogYXdhaXQgZGIuY3VzdG9tZXJzLmNyZWF0ZSh7IC4uLnBhcnNlZCwgY3JlYXRlZF9ieTogY3VycmVudFVzZXIuaWQgfSwgY3VycmVudFVzZXIpIH0pO1xuICB9IGVsc2UgaWYgKG1ldGhvZCA9PT0gJ1BVVCcgJiYgcGF0aC5zdGFydHNXaXRoKCcvYXBpL2N1c3RvbWVycy8nKSkge1xuICAgIGlmICghY3AoUEVSTS5DVVNUT01FUl9VUERBVEUpKSByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCBjID0gYXdhaXQgZGIuY3VzdG9tZXJzLnVwZGF0ZShwYXRoLnNwbGl0KCcvJykucG9wKCksIHBhcnNlZCwgY3VycmVudFVzZXIpO1xuICAgIGlmICghYykgc2VuZCg0MDQsIHsgZXJyb3I6ICdDdXN0b21lciBub3QgZm91bmQuJyB9KTsgZWxzZSBzZW5kKDIwMCwgeyBjdXN0b21lcjogYyB9KTtcbiAgfSBlbHNlIGlmIChwYXRoID09PSAnL2FwaS9wcm9kdWN0cycgJiYgbWV0aG9kID09PSAnR0VUJykge1xuICAgIGlmICghY3AoUEVSTS5QUk9EVUNUX1JFQUQpKSByZXR1cm4gdHJ1ZTtcbiAgICBzZW5kKDIwMCwgeyBwcm9kdWN0czogKGF3YWl0IGRiLnByb2R1Y3RzLmZpbmRBbGwoY3VycmVudFVzZXIpKS5maWx0ZXIoQm9vbGVhbiksIGNhdGVnb3JpZXM6IChhd2FpdCBkYi5wcm9kdWN0Q2F0ZWdvcmllcy5maW5kQWxsKGN1cnJlbnRVc2VyKSkuZmlsdGVyKEJvb2xlYW4pIH0pO1xuICB9IGVsc2UgaWYgKHBhdGggPT09ICcvYXBpL3Byb2R1Y3RzJyAmJiBtZXRob2QgPT09ICdQT1NUJykge1xuICAgIGlmICghY3AoUEVSTS5QUk9EVUNUX0NSRUFURSkpIHJldHVybiB0cnVlO1xuICAgIHNlbmQoMjAxLCB7IHByb2R1Y3Q6IGF3YWl0IGRiLnByb2R1Y3RzLmNyZWF0ZSh7IC4uLnBhcnNlZCwgY3JlYXRlZF9ieTogY3VycmVudFVzZXIuaWQgfSwgY3VycmVudFVzZXIpIH0pO1xuICB9IGVsc2UgaWYgKG1ldGhvZCA9PT0gJ1BVVCcgJiYgcGF0aC5zdGFydHNXaXRoKCcvYXBpL3Byb2R1Y3RzLycpKSB7XG4gICAgaWYgKCFjcChQRVJNLlBST0RVQ1RfVVBEQVRFKSkgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgcCA9IGF3YWl0IGRiLnByb2R1Y3RzLnVwZGF0ZShwYXRoLnNwbGl0KCcvJykucG9wKCksIHBhcnNlZCwgY3VycmVudFVzZXIpO1xuICAgIGlmICghcCkgc2VuZCg0MDQsIHsgZXJyb3I6ICdQcm9kdWN0IG5vdCBmb3VuZC4nIH0pOyBlbHNlIHNlbmQoMjAwLCB7IHByb2R1Y3Q6IHAgfSk7XG4gIH0gZWxzZSBpZiAocGF0aCA9PT0gJy9hcGkvYmFua3MnICYmIG1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICBpZiAoIWNwKFBFUk0uSU5WT0lDRV9SRUFEKSkgcmV0dXJuIHRydWU7XG4gICAgc2VuZCgyMDAsIHsgYmFua3M6IChhd2FpdCBkYi5iYW5rcy5maW5kQWxsKGN1cnJlbnRVc2VyKSkuZmlsdGVyKEJvb2xlYW4pIH0pO1xuICB9IGVsc2UgaWYgKHBhdGggPT09ICcvYXBpL2JhbmtzJyAmJiBtZXRob2QgPT09ICdQT1NUJykge1xuICAgIGlmICghY3AoUEVSTS5JTlZPSUNFX0NSRUFURSkpIHJldHVybiB0cnVlO1xuICAgIHNlbmQoMjAxLCB7IGJhbms6IGF3YWl0IGRiLmJhbmtzLmNyZWF0ZSh7IC4uLnBhcnNlZCwgY3JlYXRlZF9ieTogY3VycmVudFVzZXIuaWQgfSwgY3VycmVudFVzZXIpIH0pO1xuICB9IGVsc2UgaWYgKG1ldGhvZCA9PT0gJ1BVVCcgJiYgcGF0aC5zdGFydHNXaXRoKCcvYXBpL2JhbmtzLycpKSB7XG4gICAgaWYgKCFjcChQRVJNLklOVk9JQ0VfVVBEQVRFKSkgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgYiA9IGF3YWl0IGRiLmJhbmtzLnVwZGF0ZShwYXRoLnNwbGl0KCcvJykucG9wKCksIHBhcnNlZCwgY3VycmVudFVzZXIpO1xuICAgIGlmICghYikgc2VuZCg0MDQsIHsgZXJyb3I6ICdCYW5rIG5vdCBmb3VuZC4nIH0pOyBlbHNlIHNlbmQoMjAwLCB7IGJhbms6IGIgfSk7XG4gIH0gZWxzZSBpZiAobWV0aG9kID09PSAnREVMRVRFJyAmJiBwYXRoLnN0YXJ0c1dpdGgoJy9hcGkvYmFua3MvJykpIHtcbiAgICBpZiAoIWNwKFBFUk0uSU5WT0lDRV9ERUxFVEUpKSByZXR1cm4gdHJ1ZTtcbiAgICBhd2FpdCBkYi5iYW5rcy5kZWxldGUocGF0aC5zcGxpdCgnLycpLnBvcCgpLCBjdXJyZW50VXNlcik7XG4gICAgc2VuZCgyMDAsIHsgb2s6IHRydWUgfSk7XG4gIH0gZWxzZSBpZiAocGF0aCA9PT0gJy9hcGkvc2lnbmF0dXJlcycgJiYgbWV0aG9kID09PSAnR0VUJykge1xuICAgIGlmICghY3AoUEVSTS5JTlZPSUNFX1JFQUQpKSByZXR1cm4gdHJ1ZTtcbiAgICBzZW5kKDIwMCwgeyBzaWduYXR1cmVzOiAoYXdhaXQgZGIuc2lnbmF0dXJlcy5maW5kQWxsKGN1cnJlbnRVc2VyKSkuZmlsdGVyKEJvb2xlYW4pIH0pO1xuICB9IGVsc2UgaWYgKHBhdGggPT09ICcvYXBpL3NpZ25hdHVyZXMnICYmIG1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgaWYgKCFjcChQRVJNLklOVk9JQ0VfQ1JFQVRFKSkgcmV0dXJuIHRydWU7XG4gICAgc2VuZCgyMDEsIHsgc2lnbmF0dXJlOiBhd2FpdCBkYi5zaWduYXR1cmVzLmNyZWF0ZSh7IC4uLnBhcnNlZCwgY3JlYXRlZF9ieTogY3VycmVudFVzZXIuaWQgfSwgY3VycmVudFVzZXIpIH0pO1xuICB9IGVsc2UgaWYgKG1ldGhvZCA9PT0gJ0RFTEVURScgJiYgcGF0aC5zdGFydHNXaXRoKCcvYXBpL3NpZ25hdHVyZXMvJykpIHtcbiAgICBpZiAoIWNwKFBFUk0uSU5WT0lDRV9ERUxFVEUpKSByZXR1cm4gdHJ1ZTtcbiAgICBhd2FpdCBkYi5zaWduYXR1cmVzLmRlbGV0ZShwYXRoLnNwbGl0KCcvJykucG9wKCksIGN1cnJlbnRVc2VyKTtcbiAgICBzZW5kKDIwMCwgeyBvazogdHJ1ZSB9KTtcbiAgfSBlbHNlIGlmIChwYXRoID09PSAnL2FwaS9pbnZvaWNlcy9uZXh0LW51bWJlcicgJiYgbWV0aG9kID09PSAnR0VUJykge1xuICAgIGlmICghY3AoUEVSTS5JTlZPSUNFX1JFQUQpKSByZXR1cm4gdHJ1ZTtcbiAgICBzZW5kKDIwMCwgeyBudW1iZXI6IGF3YWl0IGRiLmludm9pY2VzLm5leHROdW1iZXIocGFyc2VkLnByZWZpeCwgY3VycmVudFVzZXIpIH0pO1xuICB9IGVsc2UgaWYgKHBhdGggPT09ICcvYXBpL2ludm9pY2VzJyAmJiBtZXRob2QgPT09ICdHRVQnKSB7XG4gICAgaWYgKCFjcChQRVJNLklOVk9JQ0VfUkVBRCkpIHJldHVybiB0cnVlO1xuICAgIHNlbmQoMjAwLCB7IGludm9pY2VzOiBhd2FpdCBkYi5pbnZvaWNlcy5maW5kQWxsKGN1cnJlbnRVc2VyKSB9KTtcbiAgfSBlbHNlIGlmIChwYXRoID09PSAnL2FwaS9pbnZvaWNlcycgJiYgbWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICBpZiAoIWNwKFBFUk0uSU5WT0lDRV9DUkVBVEUpKSByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkYi5pbnZvaWNlcy5zYXZlKHsgLi4ucGFyc2VkLCBjcmVhdGVkX2J5OiBjdXJyZW50VXNlci5pZCB9LCBjdXJyZW50VXNlcik7XG4gICAgaWYgKCFyZXN1bHQub2spIHNlbmQoNDA5LCB7IGVycm9yOiByZXN1bHQuZXJyb3IgfSk7IGVsc2Ugc2VuZCgyMDEsIHsgaW52b2ljZTogcmVzdWx0Lmludm9pY2UgfSk7XG4gIH0gZWxzZSBpZiAobWV0aG9kID09PSAnR0VUJyAmJiBwYXRoLnN0YXJ0c1dpdGgoJy9hcGkvaW52b2ljZXMvJykpIHtcbiAgICBpZiAoIWNwKFBFUk0uSU5WT0lDRV9SRUFEKSkgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgaW52ID0gYXdhaXQgZGIuaW52b2ljZXMuZmluZEJ5SWQocGF0aC5zcGxpdCgnLycpLnBvcCgpLCBjdXJyZW50VXNlcik7XG4gICAgaWYgKCFpbnYpIHNlbmQoNDA0LCB7IGVycm9yOiAnSW52b2ljZSBub3QgZm91bmQuJyB9KTsgZWxzZSBzZW5kKDIwMCwgeyBpbnZvaWNlOiBpbnYgfSk7XG4gIH0gZWxzZSBpZiAobWV0aG9kID09PSAnUFVUJyAmJiBwYXRoLnN0YXJ0c1dpdGgoJy9hcGkvaW52b2ljZXMvJykpIHtcbiAgICBpZiAoIWNwKFBFUk0uSU5WT0lDRV9VUERBVEUpKSByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkYi5pbnZvaWNlcy5zYXZlKHBhcnNlZCwgY3VycmVudFVzZXIpO1xuICAgIGlmICghcmVzdWx0Lm9rKSBzZW5kKDQwOSwgeyBlcnJvcjogcmVzdWx0LmVycm9yIH0pOyBlbHNlIHNlbmQoMjAwLCB7IGludm9pY2U6IHJlc3VsdC5pbnZvaWNlIH0pO1xuICB9IGVsc2UgaWYgKG1ldGhvZCA9PT0gJ1BPU1QnICYmIHBhdGgubWF0Y2goL15cXC9hcGlcXC9pbnZvaWNlc1xcLyhbMC05YS1mQS1GLV0rKVxcL2R1cGxpY2F0ZSQvKSkge1xuICAgIGlmICghY3AoUEVSTS5JTlZPSUNFX0NSRUFURSkpIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IGlkID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL2ludm9pY2VzXFwvKFswLTlhLWZBLUYtXSspXFwvZHVwbGljYXRlJC8pWzFdO1xuICAgIGNvbnN0IG9yaWdpbmFsID0gYXdhaXQgZGIuaW52b2ljZXMuZmluZEJ5SWQoaWQsIGN1cnJlbnRVc2VyKTtcbiAgICBpZiAoIW9yaWdpbmFsKSB7IHNlbmQoNDA0LCB7IGVycm9yOiAnSW52b2ljZSBub3QgZm91bmQuJyB9KTsgcmV0dXJuIHRydWU7IH1cbiAgICBjb25zdCBkdXAgPSB7IC4uLm9yaWdpbmFsLCBpZDogdW5kZWZpbmVkLCBpbnZvaWNlTnVtYmVyOiB1bmRlZmluZWQsIGNyZWF0ZWRfYXQ6IHVuZGVmaW5lZCwgdXBkYXRlZF9hdDogdW5kZWZpbmVkLCBzdGF0dXM6ICdkcmFmdCcgfTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkYi5pbnZvaWNlcy5zYXZlKHsgLi4uZHVwLCBjcmVhdGVkX2J5OiBjdXJyZW50VXNlci5pZCB9LCBjdXJyZW50VXNlcik7XG4gICAgaWYgKCFyZXN1bHQub2spIHNlbmQoNDA5LCB7IGVycm9yOiByZXN1bHQuZXJyb3IgfSk7IGVsc2Ugc2VuZCgyMDEsIHsgaW52b2ljZTogcmVzdWx0Lmludm9pY2UgfSk7XG4gIH0gZWxzZSBpZiAobWV0aG9kID09PSAnREVMRVRFJyAmJiBwYXRoLnN0YXJ0c1dpdGgoJy9hcGkvaW52b2ljZXMvJykpIHtcbiAgICBpZiAoIWNwKFBFUk0uSU5WT0lDRV9ERUxFVEUpKSByZXR1cm4gdHJ1ZTtcbiAgICBhd2FpdCBkYi5pbnZvaWNlcy5kZWxldGUocGF0aC5zcGxpdCgnLycpLnBvcCgpLCBjdXJyZW50VXNlcik7XG4gICAgc2VuZCgyMDAsIHsgb2s6IHRydWUgfSk7XG4gIH0gZWxzZSB7XG4gICAgc2VuZCg0MDQsIHsgZXJyb3I6ICdOb3QgZm91bmQuJyB9KTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlU3VwYWJhc2Uoc3VwYWJhc2UsIHBhdGgsIG1ldGhvZCwgcGFyc2VkLCBzZW5kLCBjdXJyZW50VXNlcikge1xuICBmdW5jdGlvbiBjcChwZXJtKSB7XG4gICAgaWYgKCFjdXJyZW50VXNlcikgeyBzZW5kKDQwMSwgeyBlcnJvcjogJ0F1dGhlbnRpY2F0aW9uIHJlcXVpcmVkLicgfSk7IHJldHVybiBmYWxzZTsgfVxuICAgIGlmICghY3VycmVudFVzZXIucGVybWlzc2lvbnM/LmluY2x1ZGVzKHBlcm0pICYmICFjdXJyZW50VXNlci5wZXJtaXNzaW9ucz8uaW5jbHVkZXMoJyonKSkge1xuICAgICAgc2VuZCg0MDMsIHsgZXJyb3I6ICdGb3JiaWRkZW4uJyB9KTsgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChwYXRoID09PSAnL2FwaS9hdXRoL2xvZ2luJyAmJiBtZXRob2QgPT09ICdQT1NUJykge1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguc2lnbkluV2l0aFBhc3N3b3JkKHtcbiAgICAgIGVtYWlsOiBwYXJzZWQuaWRlbnRpZmllciwgcGFzc3dvcmQ6IHBhcnNlZC5wYXNzd29yZCxcbiAgICB9KTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDQwMSwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHtcbiAgICAgIHVzZXI6IHsgaWQ6IGRhdGEudXNlci5pZCwgZW1haWw6IGRhdGEudXNlci5lbWFpbCwgcm9sZTogZGF0YS51c2VyLnVzZXJfbWV0YWRhdGE/LnJvbGUgfHwgJ3VzZXInLCBwZXJtaXNzaW9uczogZGF0YS51c2VyLnVzZXJfbWV0YWRhdGE/LnBlcm1pc3Npb25zIHx8IFtdIH0sXG4gICAgICB0b2tlbjogZGF0YS5zZXNzaW9uLmFjY2Vzc190b2tlbixcbiAgICB9KTtcbiAgfVxuXG4gIGlmIChwYXRoID09PSAnL2FwaS9hdXRoL3JlZ2lzdGVyJyAmJiBtZXRob2QgPT09ICdQT1NUJykge1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguc2lnblVwKHtcbiAgICAgIGVtYWlsOiBwYXJzZWQuZW1haWwsIHBhc3N3b3JkOiBwYXJzZWQucGFzc3dvcmQsXG4gICAgICBvcHRpb25zOiB7IGRhdGE6IHsgbmFtZTogcGFyc2VkLm5hbWUsIHBob25lOiBwYXJzZWQucGhvbmUsIHJvbGU6IHBhcnNlZC5yb2xlIHx8ICd1c2VyJywgcGVybWlzc2lvbnM6IFtdIH0gfSxcbiAgICB9KTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDQwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDEsIHtcbiAgICAgIHVzZXI6IHsgaWQ6IGRhdGEudXNlci5pZCwgZW1haWw6IHBhcnNlZC5lbWFpbCwgcm9sZTogcGFyc2VkLnJvbGUgfHwgJ3VzZXInLCBwZXJtaXNzaW9uczogW10gfSxcbiAgICAgIHRva2VuOiBkYXRhLnNlc3Npb24/LmFjY2Vzc190b2tlbiB8fCAnJyxcbiAgICAgIG5vdGljZTogJ0FjY291bnQgY3JlYXRlZC4nLFxuICAgIH0pO1xuICB9XG5cbiAgaWYgKHBhdGggPT09ICcvYXBpL2F1dGgvbG9nb3V0JyAmJiBtZXRob2QgPT09ICdQT1NUJykge1xuICAgIGF3YWl0IHN1cGFiYXNlLmF1dGguc2lnbk91dCgpO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBvazogdHJ1ZSB9KTtcbiAgfVxuXG4gIGlmIChwYXRoID09PSAnL2FwaS9hdXRoL21lJyAmJiBtZXRob2QgPT09ICdHRVQnKSB7XG4gICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBzdXBhYmFzZS5hdXRoLmdldFVzZXIoY3VycmVudFVzZXI/LmlkID8gY3VycmVudFVzZXIuaWQgOiB1bmRlZmluZWQpO1xuICAgIGlmICghZGF0YT8udXNlcikgcmV0dXJuIHNlbmQoNDAxLCB7IGVycm9yOiAnTm90IGF1dGhlbnRpY2F0ZWQuJyB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgdXNlcjogeyBpZDogZGF0YS51c2VyLmlkLCBlbWFpbDogZGF0YS51c2VyLmVtYWlsLCByb2xlOiBkYXRhLnVzZXIudXNlcl9tZXRhZGF0YT8ucm9sZSB8fCAndXNlcicsIHBlcm1pc3Npb25zOiBkYXRhLnVzZXIudXNlcl9tZXRhZGF0YT8ucGVybWlzc2lvbnMgfHwgW10gfSB9KTtcbiAgfVxuXG4gIGNvbnN0IGFkbWluQ2xpZW50ID0gYXdhaXQgYWRtaW5TdXBhYmFzZSgpO1xuXG4gIGlmIChtZXRob2QgPT09ICdHRVQnICYmIHBhdGggPT09ICcvYXBpL3JvbGVzJykge1xuICAgIGlmICghY3AoJ3JvbGU6cmVhZCcpKSByZXR1cm47XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgncm9sZXMnKS5zZWxlY3QoJyonKTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgcm9sZXM6IGRhdGEgfHwgW10gfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnR0VUJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvcm9sZXNcXC8oLispJC8pKSB7XG4gICAgaWYgKCFjcCgncm9sZTpyZWFkJykpIHJldHVybjtcbiAgICBjb25zdCBpZCA9IHBhdGgubWF0Y2goL15cXC9hcGlcXC9yb2xlc1xcLyguKykkLylbMV07XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgncm9sZXMnKS5zZWxlY3QoJyonKS5lcSgnaWQnLCBpZCkuc2luZ2xlKCk7XG4gICAgaWYgKGVycm9yIHx8ICFkYXRhKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdSb2xlIG5vdCBmb3VuZC4nIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyByb2xlOiBkYXRhIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ1BPU1QnICYmIHBhdGggPT09ICcvYXBpL3JvbGVzJykge1xuICAgIGlmICghY3AoJ3JvbGU6Y3JlYXRlJykpIHJldHVybjtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdyb2xlcycpLmluc2VydChwYXJzZWQpLnNlbGVjdCgpLnNpbmdsZSgpO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMSwgeyByb2xlOiBkYXRhIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ1BVVCcgJiYgcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3JvbGVzXFwvKC4rKSQvKSkge1xuICAgIGlmICghY3AoJ3JvbGU6dXBkYXRlJykpIHJldHVybjtcbiAgICBjb25zdCBpZCA9IHBhdGgubWF0Y2goL15cXC9hcGlcXC9yb2xlc1xcLyguKykkLylbMV07XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgncm9sZXMnKS51cGRhdGUocGFyc2VkKS5lcSgnaWQnLCBpZCkuc2VsZWN0KCkuc2luZ2xlKCk7XG4gICAgaWYgKGVycm9yIHx8ICFkYXRhKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdSb2xlIG5vdCBmb3VuZC4nIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyByb2xlOiBkYXRhIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ0RFTEVURScgJiYgcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3JvbGVzXFwvKC4rKSQvKSkge1xuICAgIGlmICghY3AoJ3JvbGU6ZGVsZXRlJykpIHJldHVybjtcbiAgICBjb25zdCBpZCA9IHBhdGgubWF0Y2goL15cXC9hcGlcXC9yb2xlc1xcLyguKykkLylbMV07XG4gICAgY29uc3QgeyBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgncm9sZXMnKS5kZWxldGUoKS5lcSgnaWQnLCBpZCk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4gc2VuZCg1MDAsIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IG9rOiB0cnVlIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aCA9PT0gJy9hcGkvdXNlcnMnKSB7XG4gICAgaWYgKCFjcCgndXNlcjpyZWFkJykpIHJldHVybjtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCd1c2VycycpLnNlbGVjdCgnKicpO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyB1c2VyczogZGF0YSB8fCBbXSB9KTtcbiAgfVxuXG4gIGlmIChtZXRob2QgPT09ICdHRVQnICYmIHBhdGgubWF0Y2goL15cXC9hcGlcXC91c2Vyc1xcLyguKykkLykpIHtcbiAgICBpZiAoIWNwKCd1c2VyOnJlYWQnKSkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3VzZXJzXFwvKC4rKSQvKVsxXTtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCd1c2VycycpLnNlbGVjdCgnKicpLmVxKCdpZCcsIGlkKS5zaW5nbGUoKTtcbiAgICBpZiAoZXJyb3IgfHwgIWRhdGEpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ1VzZXIgbm90IGZvdW5kLicgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHVzZXI6IGRhdGEgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnUE9TVCcgJiYgcGF0aCA9PT0gJy9hcGkvdXNlcnMnKSB7XG4gICAgaWYgKCFjcCgndXNlcjpjcmVhdGUnKSkgcmV0dXJuO1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ3VzZXJzJykuaW5zZXJ0KHBhcnNlZCkuc2VsZWN0KCkuc2luZ2xlKCk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4gc2VuZCg1MDAsIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAxLCB7IHVzZXI6IGRhdGEgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnUFVUJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvdXNlcnNcXC8oLispJC8pKSB7XG4gICAgaWYgKCFjcCgndXNlcjp1cGRhdGUnKSkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3VzZXJzXFwvKC4rKSQvKVsxXTtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCd1c2VycycpLnVwZGF0ZShwYXJzZWQpLmVxKCdpZCcsIGlkKS5zZWxlY3QoKS5zaW5nbGUoKTtcbiAgICBpZiAoZXJyb3IgfHwgIWRhdGEpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ1VzZXIgbm90IGZvdW5kLicgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHVzZXI6IGRhdGEgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnREVMRVRFJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvdXNlcnNcXC8oLispJC8pKSB7XG4gICAgaWYgKCFjcCgndXNlcjpkZWxldGUnKSkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3VzZXJzXFwvKC4rKSQvKVsxXTtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCd1c2VycycpLmRlbGV0ZSgpLmVxKCdpZCcsIGlkKTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgb2s6IHRydWUgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnR0VUJyAmJiBwYXRoID09PSAnL2FwaS9zZXR0aW5ncycpIHtcbiAgICBpZiAoIWNwKCdzZXR0aW5nczpyZWFkJykpIHJldHVybjtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdzZXR0aW5ncycpLnNlbGVjdCgnKicpO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIGNvbnN0IHNldHRpbmdzID0ge307XG4gICAgKGRhdGEgfHwgW10pLmZvckVhY2goKHJvdykgPT4geyBzZXR0aW5nc1tyb3cua2V5XSA9IHJvdy52YWx1ZTsgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHNldHRpbmdzIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ1BVVCcgJiYgcGF0aCA9PT0gJy9hcGkvc2V0dGluZ3MnKSB7XG4gICAgaWYgKCFjcCgnc2V0dGluZ3M6dXBkYXRlJykpIHJldHVybjtcbiAgICBjb25zdCB7IGRhdGE6IG9sZERhdGEsIGVycm9yOiBvbGRFcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnc2V0dGluZ3MnKS5zZWxlY3QoJyonKTtcbiAgICBjb25zdCBvbGRTZXR0aW5ncyA9IHt9O1xuICAgIGlmICghb2xkRXJyb3IgJiYgb2xkRGF0YSkgb2xkRGF0YS5mb3JFYWNoKChyb3cpID0+IHsgb2xkU2V0dGluZ3Nbcm93LmtleV0gPSByb3cudmFsdWU7IH0pO1xuXG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMocGFyc2VkKSkge1xuICAgICAgY29uc3QgeyBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnc2V0dGluZ3MnKS51cHNlcnQoXG4gICAgICAgIHsga2V5LCB2YWx1ZTogdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IHZhbHVlIDogSlNPTi5zdHJpbmdpZnkodmFsdWUpIH0sXG4gICAgICAgIHsgb25Db25mbGljdDogJ2tleScgfVxuICAgICAgKTtcbiAgICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIH1cblxuICAgIC8vIEF1ZGl0IGxvZyBlYWNoIGNoYW5nZWQgc2V0dGluZ1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHBhcnNlZCkpIHtcbiAgICAgIGNvbnN0IG9sZFZhbCA9IG9sZFNldHRpbmdzPy5ba2V5XTtcbiAgICAgIGlmIChvbGRWYWwgIT09IHVuZGVmaW5lZCAmJiBvbGRWYWwgIT09IHZhbHVlKSB7XG4gICAgICAgIGF3YWl0IGNyZWF0ZUF1ZGl0TG9nKCdzZXR0aW5ncycsIGtleSwgJ3VwZGF0ZWQnLCB7IFtrZXldOiBvbGRWYWwgfSwgeyBba2V5XTogdmFsdWUgfSwgY3VycmVudFVzZXI/LmlkKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgb2s6IHRydWUgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnR0VUJyAmJiBwYXRoID09PSAnL2FwaS9sYW5ndWFnZXMnKSB7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7XG4gICAgICBsYW5ndWFnZXM6IFtcbiAgICAgICAgeyBjb2RlOiAnZW4nLCBuYW1lOiAnRW5nbGlzaCcsIG5hdGl2ZU5hbWU6ICdFbmdsaXNoJyB9LFxuICAgICAgICB7IGNvZGU6ICdlcycsIG5hbWU6ICdTcGFuaXNoJywgbmF0aXZlTmFtZTogJ0VzcGFcdTAwRjFvbCcgfSxcbiAgICAgICAgeyBjb2RlOiAnZnInLCBuYW1lOiAnRnJlbmNoJywgbmF0aXZlTmFtZTogJ0ZyYW5cdTAwRTdhaXMnIH0sXG4gICAgICAgIHsgY29kZTogJ2RlJywgbmFtZTogJ0dlcm1hbicsIG5hdGl2ZU5hbWU6ICdEZXV0c2NoJyB9LFxuICAgICAgICB7IGNvZGU6ICdwdCcsIG5hbWU6ICdQb3J0dWd1ZXNlJywgbmF0aXZlTmFtZTogJ1BvcnR1Z3VcdTAwRUFzJyB9LFxuICAgICAgICB7IGNvZGU6ICdpdCcsIG5hbWU6ICdJdGFsaWFuJywgbmF0aXZlTmFtZTogJ0l0YWxpYW5vJyB9LFxuICAgICAgICB7IGNvZGU6ICdubCcsIG5hbWU6ICdEdXRjaCcsIG5hdGl2ZU5hbWU6ICdOZWRlcmxhbmRzJyB9LFxuICAgICAgICB7IGNvZGU6ICdwbCcsIG5hbWU6ICdQb2xpc2gnLCBuYXRpdmVOYW1lOiAnUG9sc2tpJyB9LFxuICAgICAgICB7IGNvZGU6ICdydScsIG5hbWU6ICdSdXNzaWFuJywgbmF0aXZlTmFtZTogJ1x1MDQyMFx1MDQ0M1x1MDQ0MVx1MDQ0MVx1MDQzQVx1MDQzOFx1MDQzOScgfSxcbiAgICAgICAgeyBjb2RlOiAnamEnLCBuYW1lOiAnSmFwYW5lc2UnLCBuYXRpdmVOYW1lOiAnXHU2NUU1XHU2NzJDXHU4QTlFJyB9LFxuICAgICAgICB7IGNvZGU6ICdrbycsIG5hbWU6ICdLb3JlYW4nLCBuYXRpdmVOYW1lOiAnXHVENTVDXHVBRDZEXHVDNUI0JyB9LFxuICAgICAgICB7IGNvZGU6ICd6aCcsIG5hbWU6ICdDaGluZXNlIChTaW1wbGlmaWVkKScsIG5hdGl2ZU5hbWU6ICdcdTdCODBcdTRGNTNcdTRFMkRcdTY1ODcnIH0sXG4gICAgICAgIHsgY29kZTogJ2FyJywgbmFtZTogJ0FyYWJpYycsIG5hdGl2ZU5hbWU6ICdcdTA2MjdcdTA2NDRcdTA2MzlcdTA2MzFcdTA2MjhcdTA2NEFcdTA2MjknIH0sXG4gICAgICAgIHsgY29kZTogJ2hpJywgbmFtZTogJ0hpbmRpJywgbmF0aXZlTmFtZTogJ1x1MDkzOVx1MDkzRlx1MDkyOFx1MDk0RFx1MDkyNlx1MDk0MCcgfSxcbiAgICAgICAgeyBjb2RlOiAnYm4nLCBuYW1lOiAnQmVuZ2FsaScsIG5hdGl2ZU5hbWU6ICdcdTA5QUNcdTA5QkVcdTA5ODJcdTA5QjJcdTA5QkUnIH0sXG4gICAgICBdLFxuICAgIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ1BPU1QnICYmIHBhdGggPT09ICcvYXBpL3NldHRpbmdzL2xvZ28nKSB7XG4gICAgaWYgKCFjcCgnc2V0dGluZ3M6dXBkYXRlJykpIHJldHVybjtcbiAgICBpZiAoIXBhcnNlZC5maWxlRGF0YSkgcmV0dXJuIHNlbmQoNDAwLCB7IGVycm9yOiAnTm8gZmlsZSBkYXRhIHByb3ZpZGVkLicgfSk7XG4gICAgY29uc3QgeyBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnc2V0dGluZ3MnKS51cHNlcnQoXG4gICAgICB7IGtleTogJ2xvZ28nLCB2YWx1ZTogcGFyc2VkLmZpbGVEYXRhIH0sXG4gICAgICB7IG9uQ29uZmxpY3Q6ICdrZXknIH1cbiAgICApO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIGF3YWl0IGNyZWF0ZUF1ZGl0TG9nKCdzZXR0aW5ncycsICdsb2dvJywgJ3VwZGF0ZWQnLCBudWxsLCB7IGxvZ286ICcoaW1hZ2UgZGF0YSknIH0sIGN1cnJlbnRVc2VyPy5pZCk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IG9rOiB0cnVlLCBsb2dvOiBwYXJzZWQuZmlsZURhdGEgfSk7XG4gIH1cblxuICAvLyA9PT09PSBEb2N1bWVudCBUeXBlcyAmIEN1c3RvbSBIZWFkZXJzIChTdXBhYmFzZSkgPT09PT1cbiAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aCA9PT0gJy9hcGkvZG9jdW1lbnQtdHlwZXMnKSB7XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnZG9jdW1lbnRfdHlwZV9tYXN0ZXInKS5zZWxlY3QoJ25hbWUnKS5vcmRlcignbmFtZScsIHsgYXNjZW5kaW5nOiB0cnVlIH0pO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyB0eXBlczogKGRhdGEgfHwgW10pLm1hcChyID0+IHIubmFtZSkgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnR0VUJyAmJiBwYXRoID09PSAnL2FwaS9jdXN0b20taGVhZGVycycpIHtcbiAgICBpZiAoIWNwKCdzZXR0aW5nczpyZWFkJykpIHJldHVybjtcbiAgICBsZXQgcXVlcnkgPSBhZG1pbkNsaWVudC5mcm9tKCdjdXN0b21faGVhZGVycycpLnNlbGVjdCgnKicpLm9yZGVyKCdkaXNwbGF5X29yZGVyJywgeyBhc2NlbmRpbmc6IHRydWUgfSk7XG4gICAgaWYgKHBhcnNlZC5hY3RpdmUgPT09ICd0cnVlJykgcXVlcnkgPSBxdWVyeS5lcSgnYWN0aXZlJywgdHJ1ZSk7XG4gICAgaWYgKHBhcnNlZC52aXNpYmxlID09PSAndHJ1ZScpIHF1ZXJ5ID0gcXVlcnkuZXEoJ3Zpc2libGUnLCB0cnVlKTtcbiAgICBpZiAocGFyc2VkLmRvY1R5cGUpIHF1ZXJ5ID0gcXVlcnkuY29udGFpbnMoJ2RvY190eXBlcycsIFtwYXJzZWQuZG9jVHlwZV0pO1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHF1ZXJ5O1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIGNvbnN0IHBhZ2VTaXplID0gcGFyc2VJbnQocGFyc2VkLnBhZ2VTaXplLCAxMCkgfHwgMjAwO1xuICAgIGNvbnN0IHBhZ2UgPSBwYXJzZUludChwYXJzZWQucGFnZSwgMTApIHx8IDE7XG4gICAgY29uc3QgYWxsID0gZGF0YSB8fCBbXTtcbiAgICBjb25zdCB0b3RhbCA9IGFsbC5sZW5ndGg7XG4gICAgY29uc3QgcGFnZWQgPSBhbGwuc2xpY2UoKHBhZ2UgLSAxKSAqIHBhZ2VTaXplLCBwYWdlICogcGFnZVNpemUpO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBpdGVtczogcGFnZWQsIHRvdGFsIH0pO1xuICB9XG4gIGlmIChtZXRob2QgPT09ICdQT1NUJyAmJiBwYXRoID09PSAnL2FwaS9jdXN0b20taGVhZGVycycpIHtcbiAgICBpZiAoIWNwKCdzZXR0aW5nczp1cGRhdGUnKSkgcmV0dXJuO1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2N1c3RvbV9oZWFkZXJzJykuaW5zZXJ0KHBhcnNlZCkuc2VsZWN0KCkuc2luZ2xlKCk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4gc2VuZCg1MDAsIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAxLCB7IGhlYWRlcjogZGF0YSB9KTtcbiAgfVxuICBjb25zdCBjaE1hdGNoID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL2N1c3RvbS1oZWFkZXJzXFwvKC4rKSQvKTtcbiAgaWYgKGNoTWF0Y2gpIHtcbiAgICBjb25zdCBpZCA9IGNoTWF0Y2hbMV07XG4gICAgaWYgKG1ldGhvZCA9PT0gJ1BVVCcpIHtcbiAgICAgIGlmICghY3AoJ3NldHRpbmdzOnVwZGF0ZScpKSByZXR1cm47XG4gICAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdjdXN0b21faGVhZGVycycpLnVwZGF0ZShwYXJzZWQpLmVxKCdpZCcsIGlkKS5zZWxlY3QoKS5zaW5nbGUoKTtcbiAgICAgIGlmIChlcnJvciB8fCAhZGF0YSkgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnQ3VzdG9tIGhlYWRlciBub3QgZm91bmQuJyB9KTtcbiAgICAgIHJldHVybiBzZW5kKDIwMCwgeyBoZWFkZXI6IGRhdGEgfSk7XG4gICAgfVxuICAgIGlmIChtZXRob2QgPT09ICdERUxFVEUnKSB7XG4gICAgICBpZiAoIWNwKCdzZXR0aW5nczp1cGRhdGUnKSkgcmV0dXJuO1xuICAgICAgY29uc3QgeyBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnY3VzdG9tX2hlYWRlcnMnKS5kZWxldGUoKS5lcSgnaWQnLCBpZCk7XG4gICAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICAgIHJldHVybiBzZW5kKDIwMCwgeyBvazogdHJ1ZSB9KTtcbiAgICB9XG4gIH1cblxuICAvLyA9PT09PSBJbnZvaWNlIGRvbWFpbiAoU3VwYWJhc2UpID09PT09XG4gIC8vIEFsbCB3cml0ZXMgc3RhbXAgY3JlYXRlZF9ieSB3aXRoIHRoZSBhdXRoZW50aWNhdGVkIHVzZXIgc28gUkxTIG93bmVyXG4gIC8vIHBvbGljaWVzIGFwcGx5LiBQZXJtaXNzaW9uIGNoZWNrcyBhcmUgZGVmZW5zZS1pbi1kZXB0aCBvbiB0b3Agb2YgdGhlXG4gIC8vIGNsaWVudCBQZXJtaXNzaW9uR2F0ZS5cbiAgY29uc3QgdWlkID0gY3VycmVudFVzZXI/LmlkO1xuICBjb25zdCB3aXRoQ3JlYXRvciA9IChyb3cpID0+ICh7IC4uLnJvdywgY3JlYXRlZF9ieTogcm93LmNyZWF0ZWRfYnkgfHwgdWlkIH0pO1xuICBjb25zdCBjbGVhbiA9IChyb3cpID0+IHsgaWYgKCFyb3cpIHJldHVybiByb3c7IGNvbnN0IHsgaXRlbXMsIHBheW1lbnRzLCAuLi5yZXN0IH0gPSByb3c7IHJldHVybiB7IC4uLnJlc3QgfTsgfTtcblxuICBpZiAobWV0aG9kID09PSAnR0VUJyAmJiBwYXRoID09PSAnL2FwaS9jdXN0b21lcnMnKSB7XG4gICAgaWYgKCFjcCgnY3VzdG9tZXI6cmVhZCcpKSByZXR1cm47XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnY3VzdG9tZXJzJykuc2VsZWN0KCcqJykub3JkZXIoJ2NyZWF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4gc2VuZCg1MDAsIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IGN1c3RvbWVyczogZGF0YSB8fCBbXSB9KTtcbiAgfVxuICBpZiAobWV0aG9kID09PSAnUE9TVCcgJiYgcGF0aCA9PT0gJy9hcGkvY3VzdG9tZXJzJykge1xuICAgIGlmICghY3AoJ2N1c3RvbWVyOmNyZWF0ZScpKSByZXR1cm47XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnY3VzdG9tZXJzJykuaW5zZXJ0KHdpdGhDcmVhdG9yKHBhcnNlZCkpLnNlbGVjdCgpLnNpbmdsZSgpO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMSwgeyBjdXN0b21lcjogZGF0YSB9KTtcbiAgfVxuICBpZiAobWV0aG9kID09PSAnUFVUJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvY3VzdG9tZXJzXFwvKC4rKSQvKSkge1xuICAgIGlmICghY3AoJ2N1c3RvbWVyOnVwZGF0ZScpKSByZXR1cm47XG4gICAgY29uc3QgaWQgPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvY3VzdG9tZXJzXFwvKC4rKSQvKVsxXTtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdjdXN0b21lcnMnKS51cGRhdGUocGFyc2VkKS5lcSgnaWQnLCBpZCkuc2VsZWN0KCkuc2luZ2xlKCk7XG4gICAgaWYgKGVycm9yIHx8ICFkYXRhKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdDdXN0b21lciBub3QgZm91bmQuJyB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgY3VzdG9tZXI6IGRhdGEgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnR0VUJyAmJiBwYXRoID09PSAnL2FwaS9wcm9kdWN0cycpIHtcbiAgICBpZiAoIWNwKCdwcm9kdWN0OnJlYWQnKSkgcmV0dXJuO1xuICAgIGNvbnN0IFtwciwgY3JdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgYWRtaW5DbGllbnQuZnJvbSgncHJvZHVjdHMnKS5zZWxlY3QoJyosIGNhdGVnb3J5OnByb2R1Y3RfY2F0ZWdvcmllcyhpZCxuYW1lKScpLm9yZGVyKCdjcmVhdGVkX2F0JywgeyBhc2NlbmRpbmc6IGZhbHNlIH0pLFxuICAgICAgYWRtaW5DbGllbnQuZnJvbSgncHJvZHVjdF9jYXRlZ29yaWVzJykuc2VsZWN0KCcqJykub3JkZXIoJ25hbWUnLCB7IGFzY2VuZGluZzogdHJ1ZSB9KSxcbiAgICBdKTtcbiAgICBpZiAocHIuZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogcHIuZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgcHJvZHVjdHM6IHByLmRhdGEgfHwgW10sIGNhdGVnb3JpZXM6IGNyLmRhdGEgfHwgW10gfSk7XG4gIH1cbiAgaWYgKG1ldGhvZCA9PT0gJ1BPU1QnICYmIHBhdGggPT09ICcvYXBpL3Byb2R1Y3RzJykge1xuICAgIGlmICghY3AoJ3Byb2R1Y3Q6Y3JlYXRlJykpIHJldHVybjtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdwcm9kdWN0cycpLmluc2VydCh3aXRoQ3JlYXRvcihwYXJzZWQpKS5zZWxlY3QoKS5zaW5nbGUoKTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDEsIHsgcHJvZHVjdDogZGF0YSB9KTtcbiAgfVxuICBpZiAobWV0aG9kID09PSAnUFVUJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvcHJvZHVjdHNcXC8oLispJC8pKSB7XG4gICAgaWYgKCFjcCgncHJvZHVjdDp1cGRhdGUnKSkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3Byb2R1Y3RzXFwvKC4rKSQvKVsxXTtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdwcm9kdWN0cycpLnVwZGF0ZShwYXJzZWQpLmVxKCdpZCcsIGlkKS5zZWxlY3QoKS5zaW5nbGUoKTtcbiAgICBpZiAoZXJyb3IgfHwgIWRhdGEpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ1Byb2R1Y3Qgbm90IGZvdW5kLicgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IHByb2R1Y3Q6IGRhdGEgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnR0VUJyAmJiBwYXRoID09PSAnL2FwaS9wcm9kdWN0LWJyYW5kcycpIHtcbiAgICBpZiAoIWNwKCdwcm9kdWN0OnJlYWQnKSkgcmV0dXJuO1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ3Byb2R1Y3RfYnJhbmRzJykuc2VsZWN0KCcqJykub3JkZXIoJ25hbWUnLCB7IGFzY2VuZGluZzogdHJ1ZSB9KTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgYnJhbmRzOiBkYXRhIHx8IFtdIH0pO1xuICB9XG4gIGlmIChtZXRob2QgPT09ICdHRVQnICYmIHBhdGggPT09ICcvYXBpL3Byb2R1Y3QtdW5pdHMnKSB7XG4gICAgaWYgKCFjcCgncHJvZHVjdDpyZWFkJykpIHJldHVybjtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdwcm9kdWN0X3VuaXRzJykuc2VsZWN0KCcqJykub3JkZXIoJ25hbWUnLCB7IGFzY2VuZGluZzogdHJ1ZSB9KTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgdW5pdHM6IGRhdGEgfHwgW10gfSk7XG4gIH1cbiAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aCA9PT0gJy9hcGkvcHJvZHVjdC13YXJlaG91c2VzJykge1xuICAgIGlmICghY3AoJ3Byb2R1Y3Q6cmVhZCcpKSByZXR1cm47XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgncHJvZHVjdF93YXJlaG91c2VzJykuc2VsZWN0KCcqJykub3JkZXIoJ25hbWUnLCB7IGFzY2VuZGluZzogdHJ1ZSB9KTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgd2FyZWhvdXNlczogZGF0YSB8fCBbXSB9KTtcbiAgfVxuICBpZiAobWV0aG9kID09PSAnR0VUJyAmJiBwYXRoID09PSAnL2FwaS9wcmljZS1saXN0cycpIHtcbiAgICBpZiAoIWNwKCdwcm9kdWN0OnJlYWQnKSkgcmV0dXJuO1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ3Byb2R1Y3RfcHJpY2VfbGlzdHMnKS5zZWxlY3QoJyonKS5vcmRlcignbmFtZScsIHsgYXNjZW5kaW5nOiB0cnVlIH0pO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBwcmljZUxpc3RzOiBkYXRhIHx8IFtdIH0pO1xuICB9XG4gIGlmIChtZXRob2QgPT09ICdHRVQnICYmIHBhdGgubWF0Y2goL15cXC9hcGlcXC9wcm9kdWN0c1xcLyguKylcXC9wcmljZS1saXN0cyQvKSkge1xuICAgIGlmICghY3AoJ3Byb2R1Y3Q6cmVhZCcpKSByZXR1cm47XG4gICAgY29uc3QgaWQgPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvcHJvZHVjdHNcXC8oLispXFwvcHJpY2UtbGlzdHMkLylbMV07XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgncHJvZHVjdF9wcmljZV9saXN0X2l0ZW1zJykuc2VsZWN0KCcqLCBwcmljZV9saXN0OnByb2R1Y3RfcHJpY2VfbGlzdHMobmFtZSknKS5lcSgncHJvZHVjdF9pZCcsIGlkKTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgaXRlbXM6IGRhdGEgfHwgW10gfSk7XG4gIH1cbiAgaWYgKG1ldGhvZCA9PT0gJ1BPU1QnICYmIHBhdGgubWF0Y2goL15cXC9hcGlcXC9wcm9kdWN0c1xcLyguKylcXC9wcmljZS1saXN0cyQvKSkge1xuICAgIGlmICghY3AoJ3Byb2R1Y3Q6dXBkYXRlJykpIHJldHVybjtcbiAgICBjb25zdCBpZCA9IHBhdGgubWF0Y2goL15cXC9hcGlcXC9wcm9kdWN0c1xcLyguKylcXC9wcmljZS1saXN0cyQvKVsxXTtcbiAgICBjb25zdCB7IGVycm9yOiBkZWxFcnIgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ3Byb2R1Y3RfcHJpY2VfbGlzdF9pdGVtcycpLmRlbGV0ZSgpLmVxKCdwcm9kdWN0X2lkJywgaWQpO1xuICAgIGlmIChkZWxFcnIpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZGVsRXJyLm1lc3NhZ2UgfSk7XG4gICAgY29uc3Qgcm93cyA9IChwYXJzZWQuaXRlbXMgfHwgW10pLm1hcChyID0+ICh7IC4uLnIsIHByb2R1Y3RfaWQ6IGlkIH0pKTtcbiAgICBpZiAocm93cy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHsgZXJyb3I6IGluc0VyciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgncHJvZHVjdF9wcmljZV9saXN0X2l0ZW1zJykuaW5zZXJ0KHJvd3MpO1xuICAgICAgaWYgKGluc0VycikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBpbnNFcnIubWVzc2FnZSB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IG9rOiB0cnVlIH0pO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aCA9PT0gJy9hcGkvYmFua3MnKSB7XG4gICAgaWYgKCFjcCgnaW52b2ljZTpyZWFkJykpIHJldHVybjtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdiYW5rcycpLnNlbGVjdCgnKicpLm9yZGVyKCdjcmVhdGVkX2F0JywgeyBhc2NlbmRpbmc6IGZhbHNlIH0pO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBiYW5rczogZGF0YSB8fCBbXSB9KTtcbiAgfVxuICBpZiAobWV0aG9kID09PSAnUE9TVCcgJiYgcGF0aCA9PT0gJy9hcGkvYmFua3MnKSB7XG4gICAgaWYgKCFjcCgnaW52b2ljZTpjcmVhdGUnKSkgcmV0dXJuO1xuICAgIC8vIFNpbmdsZSBkZWZhdWx0OiBjbGVhciBvdGhlciBkZWZhdWx0cyB3aGVuIHRoaXMgb25lIGlzIG1hcmtlZCBkZWZhdWx0LlxuICAgIGlmIChwYXJzZWQuaXNfZGVmYXVsdCkgYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnYmFua3MnKS51cGRhdGUoeyBpc19kZWZhdWx0OiBmYWxzZSB9KS5uZXEoJ2lkJywgJzAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCcpO1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2JhbmtzJykuaW5zZXJ0KHdpdGhDcmVhdG9yKHBhcnNlZCkpLnNlbGVjdCgpLnNpbmdsZSgpO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMSwgeyBiYW5rOiBkYXRhIH0pO1xuICB9XG4gIGlmIChtZXRob2QgPT09ICdQVVQnICYmIHBhdGgubWF0Y2goL15cXC9hcGlcXC9iYW5rc1xcLyguKykkLykpIHtcbiAgICBpZiAoIWNwKCdpbnZvaWNlOnVwZGF0ZScpKSByZXR1cm47XG4gICAgY29uc3QgaWQgPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvYmFua3NcXC8oLispJC8pWzFdO1xuICAgIGlmIChwYXJzZWQuaXNfZGVmYXVsdCkgYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnYmFua3MnKS51cGRhdGUoeyBpc19kZWZhdWx0OiBmYWxzZSB9KS5uZXEoJ2lkJywgaWQpO1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2JhbmtzJykudXBkYXRlKHBhcnNlZCkuZXEoJ2lkJywgaWQpLnNlbGVjdCgpLnNpbmdsZSgpO1xuICAgIGlmIChlcnJvciB8fCAhZGF0YSkgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnQmFuayBub3QgZm91bmQuJyB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgYmFuazogZGF0YSB9KTtcbiAgfVxuICBpZiAobWV0aG9kID09PSAnREVMRVRFJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvYmFua3NcXC8oLispJC8pKSB7XG4gICAgaWYgKCFjcCgnaW52b2ljZTpkZWxldGUnKSkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL2JhbmtzXFwvKC4rKSQvKVsxXTtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdiYW5rcycpLmRlbGV0ZSgpLmVxKCdpZCcsIGlkKTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgb2s6IHRydWUgfSk7XG4gIH1cblxuICBpZiAobWV0aG9kID09PSAnR0VUJyAmJiBwYXRoID09PSAnL2FwaS9zaWduYXR1cmVzJykge1xuICAgIGlmICghY3AoJ2ludm9pY2U6cmVhZCcpKSByZXR1cm47XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnc2lnbmF0dXJlcycpLnNlbGVjdCgnKicpLm9yZGVyKCdjcmVhdGVkX2F0JywgeyBhc2NlbmRpbmc6IGZhbHNlIH0pO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBzaWduYXR1cmVzOiBkYXRhIHx8IFtdIH0pO1xuICB9XG4gIGlmIChtZXRob2QgPT09ICdQT1NUJyAmJiBwYXRoID09PSAnL2FwaS9zaWduYXR1cmVzJykge1xuICAgIGlmICghY3AoJ2ludm9pY2U6Y3JlYXRlJykpIHJldHVybjtcbiAgICBpZiAocGFyc2VkLmlzX2RlZmF1bHQpIGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ3NpZ25hdHVyZXMnKS51cGRhdGUoeyBpc19kZWZhdWx0OiBmYWxzZSB9KS5uZXEoJ2lkJywgJzAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCcpO1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ3NpZ25hdHVyZXMnKS5pbnNlcnQod2l0aENyZWF0b3IocGFyc2VkKSkuc2VsZWN0KCkuc2luZ2xlKCk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4gc2VuZCg1MDAsIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHNlbmQoMjAxLCB7IHNpZ25hdHVyZTogZGF0YSB9KTtcbiAgfVxuICBpZiAobWV0aG9kID09PSAnREVMRVRFJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvc2lnbmF0dXJlc1xcLyguKykkLykpIHtcbiAgICBpZiAoIWNwKCdpbnZvaWNlOmRlbGV0ZScpKSByZXR1cm47XG4gICAgY29uc3QgaWQgPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvc2lnbmF0dXJlc1xcLyguKykkLylbMV07XG4gICAgY29uc3QgeyBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnc2lnbmF0dXJlcycpLmRlbGV0ZSgpLmVxKCdpZCcsIGlkKTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgb2s6IHRydWUgfSk7XG4gIH1cblxuICAvLyA9PT09PSBJbnZvaWNlIGRvbWFpbiBidXNpbmVzcyBsb2dpYyBoZWxwZXJzID09PT09XG4gIGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUF1ZGl0TG9nKHRhYmxlTmFtZSwgcmVjb3JkSWQsIGFjdGlvbiwgb2xkVmFsdWVzLCBuZXdWYWx1ZXMsIGNoYW5nZWRCeSkge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdhdWRpdF9sb2dzJykuaW5zZXJ0KHtcbiAgICAgICAgaWQ6IGNyeXB0by5yYW5kb21VVUlEKCksIHRhYmxlX25hbWU6IHRhYmxlTmFtZSwgcmVjb3JkX2lkOiBTdHJpbmcocmVjb3JkSWQpLFxuICAgICAgICBhY3Rpb24sIG9sZF92YWx1ZXM6IG9sZFZhbHVlcyA/IEpTT04uc3RyaW5naWZ5KG9sZFZhbHVlcykgOiBudWxsLFxuICAgICAgICBuZXdfdmFsdWVzOiBuZXdWYWx1ZXMgPyBKU09OLnN0cmluZ2lmeShuZXdWYWx1ZXMpIDogbnVsbCxcbiAgICAgICAgY2hhbmdlZF9ieTogY2hhbmdlZEJ5IHx8IHVpZCwgaXBfYWRkcmVzczogcmVxLmhlYWRlcnNbJ3gtZm9yd2FyZGVkLWZvciddIHx8IHJlcS5zb2NrZXQ/LnJlbW90ZUFkZHJlc3MgfHwgJycsXG4gICAgICAgIGNyZWF0ZWRfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2gge31cbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUFjY291bnRpbmdFbnRyaWVzKGludm9pY2VJZCwgcGF5bG9hZCkge1xuICAgIGNvbnN0IGVudHJpZXMgPSBbXTtcbiAgICAvLyBEZWJpdDogQWNjb3VudHMgUmVjZWl2YWJsZVxuICAgIGVudHJpZXMucHVzaCh7IGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLCBpbnZvaWNlX2lkOiBpbnZvaWNlSWQsIGVudHJ5X3R5cGU6ICdkZWJpdCcsIGFjY291bnRfbmFtZTogJ0FjY291bnRzIFJlY2VpdmFibGUnLCBhbW91bnQ6IHBheWxvYWQuZ3JhbmRfdG90YWwgfHwgMCwgZGVzY3JpcHRpb246IGBJbnZvaWNlICR7cGF5bG9hZC5pbnZvaWNlX251bWJlcn1gLCBjcmVhdGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgfSk7XG4gICAgLy8gQ3JlZGl0OiBTYWxlcyAvIEluY29tZVxuICAgIGVudHJpZXMucHVzaCh7IGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLCBpbnZvaWNlX2lkOiBpbnZvaWNlSWQsIGVudHJ5X3R5cGU6ICdjcmVkaXQnLCBhY2NvdW50X25hbWU6ICdTYWxlcyBJbmNvbWUnLCBhbW91bnQ6IHBheWxvYWQuc3VidG90YWwgfHwgMCwgZGVzY3JpcHRpb246IGBJbnZvaWNlICR7cGF5bG9hZC5pbnZvaWNlX251bWJlcn0gLSBTdWJ0b3RhbGAsIGNyZWF0ZWRfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSB9KTtcbiAgICAvLyBDcmVkaXQ6IFRheCAoQ0dTVCtTR1NUIG9yIElHU1QpXG4gICAgaWYgKHBheWxvYWQuY2dzdF90b3RhbCA+IDApIHtcbiAgICAgIGVudHJpZXMucHVzaCh7IGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLCBpbnZvaWNlX2lkOiBpbnZvaWNlSWQsIGVudHJ5X3R5cGU6ICdjcmVkaXQnLCBhY2NvdW50X25hbWU6ICdDR1NUIFBheWFibGUnLCBhbW91bnQ6IHBheWxvYWQuY2dzdF90b3RhbCwgZGVzY3JpcHRpb246IGBJbnZvaWNlICR7cGF5bG9hZC5pbnZvaWNlX251bWJlcn1gLCBjcmVhdGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgfSk7XG4gICAgfVxuICAgIGlmIChwYXlsb2FkLnNnc3RfdG90YWwgPiAwKSB7XG4gICAgICBlbnRyaWVzLnB1c2goeyBpZDogY3J5cHRvLnJhbmRvbVVVSUQoKSwgaW52b2ljZV9pZDogaW52b2ljZUlkLCBlbnRyeV90eXBlOiAnY3JlZGl0JywgYWNjb3VudF9uYW1lOiAnU0dTVCBQYXlhYmxlJywgYW1vdW50OiBwYXlsb2FkLnNnc3RfdG90YWwsIGRlc2NyaXB0aW9uOiBgSW52b2ljZSAke3BheWxvYWQuaW52b2ljZV9udW1iZXJ9YCwgY3JlYXRlZF9hdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpIH0pO1xuICAgIH1cbiAgICBpZiAocGF5bG9hZC5pZ3N0X3RvdGFsID4gMCkge1xuICAgICAgZW50cmllcy5wdXNoKHsgaWQ6IGNyeXB0by5yYW5kb21VVUlEKCksIGludm9pY2VfaWQ6IGludm9pY2VJZCwgZW50cnlfdHlwZTogJ2NyZWRpdCcsIGFjY291bnRfbmFtZTogJ0lHU1QgUGF5YWJsZScsIGFtb3VudDogcGF5bG9hZC5pZ3N0X3RvdGFsLCBkZXNjcmlwdGlvbjogYEludm9pY2UgJHtwYXlsb2FkLmludm9pY2VfbnVtYmVyfWAsIGNyZWF0ZWRfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSB9KTtcbiAgICB9XG4gICAgLy8gQ3JlZGl0OiBBZGRpdGlvbmFsIENoYXJnZXNcbiAgICBpZiAocGF5bG9hZC5hZGRpdGlvbmFsX2NoYXJnZXNfdG90YWwgPiAwKSB7XG4gICAgICBlbnRyaWVzLnB1c2goeyBpZDogY3J5cHRvLnJhbmRvbVVVSUQoKSwgaW52b2ljZV9pZDogaW52b2ljZUlkLCBlbnRyeV90eXBlOiAnY3JlZGl0JywgYWNjb3VudF9uYW1lOiAnT3RoZXIgQ2hhcmdlcycsIGFtb3VudDogcGF5bG9hZC5hZGRpdGlvbmFsX2NoYXJnZXNfdG90YWwsIGRlc2NyaXB0aW9uOiBgSW52b2ljZSAke3BheWxvYWQuaW52b2ljZV9udW1iZXJ9YCwgY3JlYXRlZF9hdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpIH0pO1xuICAgIH1cbiAgICBpZiAoZW50cmllcy5sZW5ndGgpIGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2FjY291bnRpbmdfZW50cmllcycpLmluc2VydChlbnRyaWVzKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZUFjY291bnRpbmdFbnRyaWVzKGludm9pY2VJZCkge1xuICAgIGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2FjY291bnRpbmdfZW50cmllcycpLmRlbGV0ZSgpLmVxKCdpbnZvaWNlX2lkJywgaW52b2ljZUlkKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHVwZGF0ZVByb2R1Y3RTdG9jayhpdGVtcywgc2lnbikge1xuICAgIC8vIHNpZ246IC0xIHRvIHJlZHVjZSBzdG9jayAocmVzZXJ2ZSksICsxIHRvIHJlc3RvcmVcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgIGlmICghaXRlbS5wcm9kdWN0X2lkKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHF0eSA9IE51bWJlcihpdGVtLnF1YW50aXR5KSB8fCAwO1xuICAgICAgaWYgKHF0eSA8PSAwKSBjb250aW51ZTtcbiAgICAgIGF3YWl0IGFkbWluQ2xpZW50LnJwYygnZXhlY19zcWwnLCB7XG4gICAgICAgIHF1ZXJ5X3RleHQ6IGBVUERBVEUgcHJvZHVjdHMgU0VUIHN0b2NrX3F1YW50aXR5ID0gR1JFQVRFU1QoMCwgc3RvY2tfcXVhbnRpdHkgJHtzaWduIDwgMCA/ICctJyA6ICcrJ30gJHtxdHl9KSBXSEVSRSBpZCA9ICcke2l0ZW0ucHJvZHVjdF9pZH0nYCxcbiAgICAgIH0pLmNhdGNoKCgpID0+IHt9KTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiB1cGRhdGVDdXN0b21lckJhbGFuY2UoY3VzdG9tZXJJZCwgZGVsdGFHcmFuZFRvdGFsLCBkZWx0YVBhaWQpIHtcbiAgICBpZiAoIWN1c3RvbWVySWQpIHJldHVybjtcbiAgICBjb25zdCBnID0gTnVtYmVyKGRlbHRhR3JhbmRUb3RhbCkgfHwgMDtcbiAgICBjb25zdCBwID0gTnVtYmVyKGRlbHRhUGFpZCkgfHwgMDtcbiAgICBjb25zdCBiYWxEZWx0YSA9IGcgLSBwO1xuICAgIGlmIChiYWxEZWx0YSA9PT0gMCAmJiBnID09PSAwKSByZXR1cm47XG4gICAgYXdhaXQgYWRtaW5DbGllbnQucnBjKCdleGVjX3NxbCcsIHtcbiAgICAgIHF1ZXJ5X3RleHQ6IGBVUERBVEUgY3VzdG9tZXJzIFNFVCBvdXRzdGFuZGluZ19iYWxhbmNlID0gR1JFQVRFU1QoMCwgb3V0c3RhbmRpbmdfYmFsYW5jZSAke2JhbERlbHRhID49IDAgPyAnKycgOiAnLSd9ICR7TWF0aC5hYnMoYmFsRGVsdGEpfSksIHRvdGFsX3B1cmNoYXNlcyA9IEdSRUFURVNUKDAsIHRvdGFsX3B1cmNoYXNlcyAke2cgPj0gMCA/ICcrJyA6ICctJ30gJHtNYXRoLmFicyhnKX0pIFdIRVJFIGlkID0gJyR7Y3VzdG9tZXJJZH0nYCxcbiAgICB9KS5jYXRjaCgoKSA9PiB7fSk7XG4gIH1cblxuICBmdW5jdGlvbiBjb21wdXRlSW52b2ljZVN0YXR1cyhpbnZvaWNlKSB7XG4gICAgY29uc3QgdG90YWwgPSBOdW1iZXIoaW52b2ljZS5ncmFuZF90b3RhbCkgfHwgMDtcbiAgICBjb25zdCBwYWlkID0gTnVtYmVyKGludm9pY2UuYW1vdW50X3BhaWQpIHx8IDA7XG4gICAgY29uc3QgZHVlID0gaW52b2ljZS5kdWVfZGF0ZSA/IG5ldyBEYXRlKGludm9pY2UuZHVlX2RhdGUpIDogbnVsbDtcbiAgICBjb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XG4gICAgdG9kYXkuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG5cbiAgICBpZiAoaW52b2ljZS5zdGF0dXMgPT09ICdjYW5jZWxsZWQnIHx8IGludm9pY2Uuc3RhdHVzID09PSAncmVmdW5kZWQnIHx8IGludm9pY2Uuc3RhdHVzID09PSAndm9pZCcpIHJldHVybiBpbnZvaWNlLnN0YXR1cztcbiAgICBpZiAocGFpZCA+PSB0b3RhbCAmJiB0b3RhbCA+IDApIHJldHVybiAncGFpZCc7XG4gICAgaWYgKHBhaWQgPiAwICYmIHBhaWQgPCB0b3RhbCkgcmV0dXJuICdwYXJ0aWFsbHlfcGFpZCc7XG4gICAgaWYgKGludm9pY2Uuc3RhdHVzID09PSAnc2VudCcgJiYgZHVlICYmIGR1ZSA8IHRvZGF5KSByZXR1cm4gJ292ZXJkdWUnO1xuICAgIGlmIChpbnZvaWNlLnN0YXR1cyA9PT0gJ3BlbmRpbmcnICYmIGR1ZSAmJiBkdWUgPCB0b2RheSkgcmV0dXJuICdvdmVyZHVlJztcbiAgICBpZiAoaW52b2ljZS5zdGF0dXMgPT09ICdwYXJ0aWFsbHlfcGFpZCcgJiYgZHVlICYmIGR1ZSA8IHRvZGF5KSByZXR1cm4gJ292ZXJkdWUnO1xuICAgIHJldHVybiBpbnZvaWNlLnN0YXR1cyB8fCAnZHJhZnQnO1xuICB9XG5cbiAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aCA9PT0gJy9hcGkvaW52b2ljZXMvbmV4dC1udW1iZXInKSB7XG4gICAgaWYgKCFjcCgnaW52b2ljZTpyZWFkJykpIHJldHVybjtcbiAgICBjb25zdCBwcmVmaXggPSAocGFyc2VkLnByZWZpeCB8fCAnSU5WJyk7XG4gICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdpbnZvaWNlcycpLnNlbGVjdCgnaW52b2ljZV9udW1iZXInKS5saWtlKCdpbnZvaWNlX251bWJlcicsIGAke3ByZWZpeH0lYCkub3JkZXIoJ2ludm9pY2VfbnVtYmVyJywgeyBhc2NlbmRpbmc6IGZhbHNlIH0pLmxpbWl0KDEpO1xuICAgIGNvbnN0IG5leHQgPSBuZXh0SW52b2ljZU51bWJlcihwcmVmaXgsIGRhdGE/LlswXT8uaW52b2ljZV9udW1iZXIpO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBudW1iZXI6IG5leHQgfSk7XG4gIH1cbiAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aCA9PT0gJy9hcGkvaW52b2ljZXMnKSB7XG4gICAgaWYgKCFjcCgnaW52b2ljZTpyZWFkJykpIHJldHVybjtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdpbnZvaWNlcycpLnNlbGVjdCgnKiwgY3VzdG9tZXI6Y3VzdG9tZXJzKGlkLG5hbWUsY29tcGFueSknKS5vcmRlcignY3JlYXRlZF9hdCcsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgaW52b2ljZXM6IGRhdGEgfHwgW10gfSk7XG4gIH1cbiAgaWYgKG1ldGhvZCA9PT0gJ1BPU1QnICYmIHBhdGggPT09ICcvYXBpL2ludm9pY2VzJykge1xuICAgIGlmICghY3AoJ2ludm9pY2U6Y3JlYXRlJykpIHJldHVybjtcbiAgICBjb25zdCB7IGl0ZW1zLCBwYXltZW50cywgLi4uaW52b2ljZVJvdyB9ID0gcGFyc2VkO1xuICAgIC8vIFVuaXF1ZW5lc3MgY2hlY2sgYmVmb3JlIGluc2VydFxuICAgIGNvbnN0IHsgZGF0YTogZHVwIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdpbnZvaWNlcycpLnNlbGVjdCgnaWQnKS5lcSgnaW52b2ljZV9udW1iZXInLCBpbnZvaWNlUm93Lmludm9pY2VfbnVtYmVyKS5saW1pdCgxKTtcbiAgICBpZiAoZHVwICYmIGR1cC5sZW5ndGgpIHJldHVybiBzZW5kKDQwOSwgeyBlcnJvcjogJ0ludm9pY2UgbnVtYmVyIGFscmVhZHkgZXhpc3RzLicgfSk7XG5cbiAgICAvLyBBdXRvLWNvbXB1dGUgc3RhdHVzOiBkcmFmdCBzdGF5cyBkcmFmdCwgb3RoZXJzIGNoZWNrIHBheW1lbnRzXG4gICAgY29uc3QgdG90YWxQYWlkID0gKHBheW1lbnRzIHx8IFtdKS5yZWR1Y2UoKHMsIHApID0+IHMgKyAoTnVtYmVyKHAuYW1vdW50KSB8fCAwKSwgMCk7XG4gICAgbGV0IHN0YXR1cyA9IGludm9pY2VSb3cuc3RhdHVzIHx8ICdkcmFmdCc7XG4gICAgaWYgKHN0YXR1cyAhPT0gJ2RyYWZ0JyAmJiB0b3RhbFBhaWQgPiAwKSB7XG4gICAgICBjb25zdCB0b3RhbCA9IE51bWJlcihpbnZvaWNlUm93LmdyYW5kX3RvdGFsKSB8fCAwO1xuICAgICAgc3RhdHVzID0gdG90YWxQYWlkID49IHRvdGFsID8gJ3BhaWQnIDogJ3BhcnRpYWxseV9wYWlkJztcbiAgICB9XG4gICAgaW52b2ljZVJvdy5zdGF0dXMgPSBzdGF0dXM7XG4gICAgaW52b2ljZVJvdy5hbW91bnRfcGFpZCA9IHRvdGFsUGFpZDtcbiAgICBpbnZvaWNlUm93LmJhbGFuY2VfZHVlID0gTWF0aC5tYXgoMCwgKE51bWJlcihpbnZvaWNlUm93LmdyYW5kX3RvdGFsKSB8fCAwKSAtIHRvdGFsUGFpZCk7XG5cbiAgICBjb25zdCB7IGRhdGE6IGludiwgZXJyb3I6IGllIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdpbnZvaWNlcycpLmluc2VydCh3aXRoQ3JlYXRvcihpbnZvaWNlUm93KSkuc2VsZWN0KCkuc2luZ2xlKCk7XG4gICAgaWYgKGllKSByZXR1cm4gc2VuZCg1MDAsIHsgZXJyb3I6IGllLm1lc3NhZ2UgfSk7XG4gICAgaWYgKGl0ZW1zPy5sZW5ndGgpIGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2ludm9pY2VfaXRlbXMnKS5pbnNlcnQoaXRlbXMubWFwKChpdCwgaSkgPT4gKHsgLi4uaXQsIGludm9pY2VfaWQ6IGludi5pZCwgc29ydF9vcmRlcjogaXQuc29ydF9vcmRlciA/PyBpIH0pKSk7XG4gICAgaWYgKHBheW1lbnRzPy5sZW5ndGgpIGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2ludm9pY2VfcGF5bWVudHMnKS5pbnNlcnQocGF5bWVudHMubWFwKChwKSA9PiAoeyAuLi5wLCBpbnZvaWNlX2lkOiBpbnYuaWQsIGNyZWF0ZWRfYnk6IHVpZCB9KSkpO1xuXG4gICAgLy8gQnVzaW5lc3MgbG9naWMgc2lkZSBlZmZlY3RzXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgdXBkYXRlUHJvZHVjdFN0b2NrKGl0ZW1zIHx8IFtdLCAtMSksXG4gICAgICB1cGRhdGVDdXN0b21lckJhbGFuY2UoaW52b2ljZVJvdy5jdXN0b21lcl9pZCwgaW52b2ljZVJvdy5ncmFuZF90b3RhbCwgdG90YWxQYWlkKSxcbiAgICAgIGNyZWF0ZUFjY291bnRpbmdFbnRyaWVzKGludi5pZCwgaW52b2ljZVJvdyksXG4gICAgICBjcmVhdGVBdWRpdExvZygnaW52b2ljZXMnLCBpbnYuaWQsICdjcmVhdGVkJywgbnVsbCwgaW52b2ljZVJvdywgdWlkKSxcbiAgICBdKTtcblxuICAgIHJldHVybiBzZW5kKDIwMSwgeyBpbnZvaWNlOiBpbnYsIHN0YXR1cyB9KTtcbiAgfVxuICBpZiAobWV0aG9kID09PSAnR0VUJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvaW52b2ljZXNcXC8oWzAtOWEtZkEtRi1dKykkLykpIHtcbiAgICBpZiAoIWNwKCdpbnZvaWNlOnJlYWQnKSkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL2ludm9pY2VzXFwvKFswLTlhLWZBLUYtXSspJC8pWzFdO1xuICAgIGNvbnN0IFtpciwgaXRlbXMsIHBheXNdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgYWRtaW5DbGllbnQuZnJvbSgnaW52b2ljZXMnKS5zZWxlY3QoJyosIGN1c3RvbWVyOmN1c3RvbWVycygqKScpLmVxKCdpZCcsIGlkKS5zaW5nbGUoKSxcbiAgICAgIGFkbWluQ2xpZW50LmZyb20oJ2ludm9pY2VfaXRlbXMnKS5zZWxlY3QoJyonKS5lcSgnaW52b2ljZV9pZCcsIGlkKS5vcmRlcignc29ydF9vcmRlcicsIHsgYXNjZW5kaW5nOiB0cnVlIH0pLFxuICAgICAgYWRtaW5DbGllbnQuZnJvbSgnaW52b2ljZV9wYXltZW50cycpLnNlbGVjdCgnKicpLmVxKCdpbnZvaWNlX2lkJywgaWQpLm9yZGVyKCdjcmVhdGVkX2F0JywgeyBhc2NlbmRpbmc6IHRydWUgfSksXG4gICAgXSk7XG4gICAgaWYgKGlyLmVycm9yIHx8ICFpci5kYXRhKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdJbnZvaWNlIG5vdCBmb3VuZC4nIH0pO1xuICAgIGNvbnN0IGludm9pY2UgPSB7IC4uLmlyLmRhdGEsIGl0ZW1zOiBpdGVtcy5kYXRhIHx8IFtdLCBwYXltZW50czogcGF5cy5kYXRhIHx8IFtdIH07XG4gICAgaW52b2ljZS5zdGF0dXMgPSBjb21wdXRlSW52b2ljZVN0YXR1cyhpbnZvaWNlKTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgaW52b2ljZSB9KTtcbiAgfVxuICBpZiAobWV0aG9kID09PSAnUFVUJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvaW52b2ljZXNcXC8oWzAtOWEtZkEtRi1dKykkLykpIHtcbiAgICBpZiAoIWNwKCdpbnZvaWNlOnVwZGF0ZScpKSByZXR1cm47XG4gICAgY29uc3QgaWQgPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvaW52b2ljZXNcXC8oWzAtOWEtZkEtRi1dKykkLylbMV07XG4gICAgY29uc3QgeyBpdGVtcywgcGF5bWVudHMsIC4uLmludm9pY2VSb3cgfSA9IHBhcnNlZDtcbiAgICBjb25zdCB7IGRhdGE6IGR1cCB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnaW52b2ljZXMnKS5zZWxlY3QoJ2lkJykuZXEoJ2ludm9pY2VfbnVtYmVyJywgaW52b2ljZVJvdy5pbnZvaWNlX251bWJlcikubmVxKCdpZCcsIGlkKS5saW1pdCgxKTtcbiAgICBpZiAoZHVwICYmIGR1cC5sZW5ndGgpIHJldHVybiBzZW5kKDQwOSwgeyBlcnJvcjogJ0ludm9pY2UgbnVtYmVyIGFscmVhZHkgZXhpc3RzLicgfSk7XG5cbiAgICAvLyBGZXRjaCBvbGQgaW52b2ljZSBmb3Igc2lkZS1lZmZlY3QgcmV2ZXJzYWxcbiAgICBjb25zdCB7IGRhdGE6IG9sZEludiB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnaW52b2ljZXMnKS5zZWxlY3QoJyosIGl0ZW1zOmludm9pY2VfaXRlbXMoKiknKS5lcSgnaWQnLCBpZCkuc2luZ2xlKCk7XG4gICAgaWYgKCFvbGRJbnYpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ0ludm9pY2Ugbm90IGZvdW5kLicgfSk7XG4gICAgY29uc3Qgb2xkSXRlbXMgPSBvbGRJbnYuaXRlbXMgfHwgW107XG4gICAgY29uc3Qgb2xkR3JhbmRUb3RhbCA9IE51bWJlcihvbGRJbnYuZ3JhbmRfdG90YWwpIHx8IDA7XG4gICAgY29uc3Qgb2xkQW1vdW50UGFpZCA9IE51bWJlcihvbGRJbnYuYW1vdW50X3BhaWQpIHx8IDA7XG5cbiAgICAvLyBBdXRvLWNvbXB1dGUgc3RhdHVzXG4gICAgY29uc3QgdG90YWxQYWlkID0gKHBheW1lbnRzIHx8IFtdKS5yZWR1Y2UoKHMsIHApID0+IHMgKyAoTnVtYmVyKHAuYW1vdW50KSB8fCAwKSwgMCk7XG4gICAgbGV0IHN0YXR1cyA9IGludm9pY2VSb3cuc3RhdHVzIHx8IG9sZEludi5zdGF0dXMgfHwgJ2RyYWZ0JztcbiAgICBpZiAoc3RhdHVzICE9PSAnZHJhZnQnICYmIHN0YXR1cyAhPT0gJ2NhbmNlbGxlZCcpIHtcbiAgICAgIGNvbnN0IHRvdGFsID0gTnVtYmVyKGludm9pY2VSb3cuZ3JhbmRfdG90YWwpIHx8IDA7XG4gICAgICBzdGF0dXMgPSB0b3RhbFBhaWQgPj0gdG90YWwgPyAncGFpZCcgOiAodG90YWxQYWlkID4gMCA/ICdwYXJ0aWFsbHlfcGFpZCcgOiBzdGF0dXMpO1xuICAgIH1cbiAgICBpbnZvaWNlUm93LnN0YXR1cyA9IHN0YXR1cztcbiAgICBpbnZvaWNlUm93LmFtb3VudF9wYWlkID0gdG90YWxQYWlkO1xuICAgIGludm9pY2VSb3cuYmFsYW5jZV9kdWUgPSBNYXRoLm1heCgwLCAoTnVtYmVyKGludm9pY2VSb3cuZ3JhbmRfdG90YWwpIHx8IDApIC0gdG90YWxQYWlkKTtcblxuICAgIGNvbnN0IHsgZGF0YTogaW52LCBlcnJvcjogaWUgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2ludm9pY2VzJykudXBkYXRlKGNsZWFuKGludm9pY2VSb3cpKS5lcSgnaWQnLCBpZCkuc2VsZWN0KCkuc2luZ2xlKCk7XG4gICAgaWYgKGllIHx8ICFpbnYpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ0ludm9pY2Ugbm90IGZvdW5kLicgfSk7XG4gICAgaWYgKGl0ZW1zKSB7XG4gICAgICBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdpbnZvaWNlX2l0ZW1zJykuZGVsZXRlKCkuZXEoJ2ludm9pY2VfaWQnLCBpZCk7XG4gICAgICBpZiAoaXRlbXMubGVuZ3RoKSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdpbnZvaWNlX2l0ZW1zJykuaW5zZXJ0KGl0ZW1zLm1hcCgoaXQsIGkpID0+ICh7IC4uLml0LCBpbnZvaWNlX2lkOiBpZCwgc29ydF9vcmRlcjogaXQuc29ydF9vcmRlciA/PyBpIH0pKSk7XG4gICAgfVxuICAgIGlmIChwYXltZW50cykge1xuICAgICAgYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnaW52b2ljZV9wYXltZW50cycpLmRlbGV0ZSgpLmVxKCdpbnZvaWNlX2lkJywgaWQpO1xuICAgICAgaWYgKHBheW1lbnRzLmxlbmd0aCkgYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnaW52b2ljZV9wYXltZW50cycpLmluc2VydChwYXltZW50cy5tYXAoKHApID0+ICh7IC4uLnAsIGludm9pY2VfaWQ6IGlkLCBjcmVhdGVkX2J5OiBwLmNyZWF0ZWRfYnkgfHwgdWlkIH0pKSk7XG4gICAgfVxuXG4gICAgLy8gQnVzaW5lc3MgbG9naWM6IHJldmVyc2Ugb2xkIGVmZmVjdHMsIGFwcGx5IG5ldyBlZmZlY3RzXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgdXBkYXRlUHJvZHVjdFN0b2NrKG9sZEl0ZW1zLCAxKSwgICAgICAvLyByZXN0b3JlIG9sZCBzdG9ja1xuICAgICAgdXBkYXRlUHJvZHVjdFN0b2NrKGl0ZW1zIHx8IFtdLCAtMSksICAvLyByZXNlcnZlIG5ldyBzdG9ja1xuICAgICAgdXBkYXRlQ3VzdG9tZXJCYWxhbmNlKGludm9pY2VSb3cuY3VzdG9tZXJfaWQsIGludm9pY2VSb3cuZ3JhbmRfdG90YWwsIHRvdGFsUGFpZCksXG4gICAgICBkZWxldGVBY2NvdW50aW5nRW50cmllcyhpZCksXG4gICAgICBjcmVhdGVBY2NvdW50aW5nRW50cmllcyhpZCwgaW52b2ljZVJvdyksXG4gICAgICBjcmVhdGVBdWRpdExvZygnaW52b2ljZXMnLCBpZCwgJ3VwZGF0ZWQnLCBvbGRJbnYsIGludm9pY2VSb3csIHVpZCksXG4gICAgXSk7XG5cbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgaW52b2ljZTogaW52LCBzdGF0dXMgfSk7XG4gIH1cbiAgaWYgKG1ldGhvZCA9PT0gJ0RFTEVURScgJiYgcGF0aC5tYXRjaCgvXlxcL2FwaVxcL2ludm9pY2VzXFwvKFswLTlhLWZBLUYtXSspJC8pKSB7XG4gICAgaWYgKCFjcCgnaW52b2ljZTpkZWxldGUnKSkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL2ludm9pY2VzXFwvKFswLTlhLWZBLUYtXSspJC8pWzFdO1xuXG4gICAgLy8gRmV0Y2ggaW52b2ljZSB3aXRoIGl0ZW1zIGZvciBzaWRlLWVmZmVjdCByZXZlcnNhbFxuICAgIGNvbnN0IHsgZGF0YTogb2xkSW52IH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdpbnZvaWNlcycpLnNlbGVjdCgnKiwgaXRlbXM6aW52b2ljZV9pdGVtcygqKScpLmVxKCdpZCcsIGlkKS5zaW5nbGUoKTtcbiAgICBpZiAoIW9sZEludikgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnSW52b2ljZSBub3QgZm91bmQuJyB9KTtcbiAgICBpZiAob2xkSW52LnN0YXR1cyA9PT0gJ3BhaWQnKSByZXR1cm4gc2VuZCg0MDksIHsgZXJyb3I6ICdDYW5ub3QgZGVsZXRlIGEgcGFpZCBpbnZvaWNlLiBDYW5jZWwgb3IgcmVmdW5kIGluc3RlYWQuJyB9KTtcbiAgICBpZiAob2xkSW52LnN0YXR1cyA9PT0gJ3JlZnVuZGVkJyB8fCBvbGRJbnYuc3RhdHVzID09PSAndm9pZCcpIHJldHVybiBzZW5kKDQwOSwgeyBlcnJvcjogJ0ludm9pY2UgYWxyZWFkeSBmaW5hbGl6ZWQuJyB9KTtcbiAgICBjb25zdCBvbGRJdGVtcyA9IG9sZEludi5pdGVtcyB8fCBbXTtcblxuICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2ludm9pY2VzJykudXBkYXRlKHsgc3RhdHVzOiAnY2FuY2VsbGVkJywgdXBkYXRlZF9hdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpIH0pLmVxKCdpZCcsIGlkKTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcblxuICAgIC8vIFNvZnQtZGVsZXRlOiByZXN0b3JlIHN0b2NrLCByZXZlcnNlIGN1c3RvbWVyIGJhbGFuY2UsIHZvaWQgYWNjb3VudGluZ1xuICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgIHVwZGF0ZVByb2R1Y3RTdG9jayhvbGRJdGVtcywgMSksXG4gICAgICB1cGRhdGVDdXN0b21lckJhbGFuY2Uob2xkSW52LmN1c3RvbWVyX2lkLCAtb2xkSW52LmdyYW5kX3RvdGFsLCAtb2xkSW52LmFtb3VudF9wYWlkKSxcbiAgICAgIGRlbGV0ZUFjY291bnRpbmdFbnRyaWVzKGlkKSxcbiAgICAgIGNyZWF0ZUF1ZGl0TG9nKCdpbnZvaWNlcycsIGlkLCAnY2FuY2VsbGVkJywgb2xkSW52LCB7IHN0YXR1czogJ2NhbmNlbGxlZCcgfSwgdWlkKSxcbiAgICBdKTtcblxuICAgIHJldHVybiBzZW5kKDIwMCwgeyBvazogdHJ1ZSwgc3RhdHVzOiAnY2FuY2VsbGVkJyB9KTtcbiAgfVxuXG4gIGlmIChtZXRob2QgPT09ICdQT1NUJyAmJiBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvaW52b2ljZXNcXC8oWzAtOWEtZkEtRi1dKylcXC9kdXBsaWNhdGUkLykpIHtcbiAgICBpZiAoIWNwKCdpbnZvaWNlOmNyZWF0ZScpKSByZXR1cm47XG4gICAgY29uc3QgaWQgPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvaW52b2ljZXNcXC8oWzAtOWEtZkEtRi1dKylcXC9kdXBsaWNhdGUkLylbMV07XG5cbiAgICBjb25zdCB7IGRhdGE6IG9yaWdpbmFsLCBlcnJvcjogZmV0Y2hFcnIgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2ludm9pY2VzJykuc2VsZWN0KCcqLCBpdGVtczppbnZvaWNlX2l0ZW1zKCopJykuZXEoJ2lkJywgaWQpLnNpbmdsZSgpO1xuICAgIGlmIChmZXRjaEVyciB8fCAhb3JpZ2luYWwpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ0ludm9pY2Ugbm90IGZvdW5kLicgfSk7XG5cbiAgICBjb25zdCB7IGludm9pY2VfbnVtYmVyOiBuZXh0TnVtIH0gPSBhd2FpdCBnZXROZXh0SW52b2ljZU51bWJlcihhZG1pbkNsaWVudCwgb3JpZ2luYWwucHJlZml4IHx8ICdJTlYtJyk7XG4gICAgY29uc3QgbmV3SW52ID0ge1xuICAgICAgcHJlZml4OiBvcmlnaW5hbC5wcmVmaXgsIGludm9pY2VfbnVtYmVyOiBuZXh0TnVtLCBjdXN0b21lcl9pZDogb3JpZ2luYWwuY3VzdG9tZXJfaWQsXG4gICAgICBpbnZvaWNlX2RhdGU6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdCgnVCcpWzBdLCBkdWVfZGF0ZTogb3JpZ2luYWwuZHVlX2RhdGUsXG4gICAgICByZWZlcmVuY2U6IG9yaWdpbmFsLnJlZmVyZW5jZSwgY3VzdG9tX2hlYWRlcnM6IG9yaWdpbmFsLmN1c3RvbV9oZWFkZXJzLFxuICAgICAgbm90ZXM6IG9yaWdpbmFsLm5vdGVzLCB0ZXJtczogb3JpZ2luYWwudGVybXMsIGF0dGFjaG1lbnRzOiBvcmlnaW5hbC5hdHRhY2htZW50cyxcbiAgICAgIHJldmVyc2VfY2hhcmdlOiBvcmlnaW5hbC5yZXZlcnNlX2NoYXJnZSwgY3JlYXRlX2V3YXliaWxsOiBvcmlnaW5hbC5jcmVhdGVfZXdheWJpbGwsXG4gICAgICBjcmVhdGVfZWludm9pY2U6IG9yaWdpbmFsLmNyZWF0ZV9laW52b2ljZSwgdGRzX2VuYWJsZWQ6IG9yaWdpbmFsLnRkc19lbmFibGVkLFxuICAgICAgdGNzX2VuYWJsZWQ6IG9yaWdpbmFsLnRjc19lbmFibGVkLCBleHRyYV9kaXNjb3VudF90eXBlOiBvcmlnaW5hbC5leHRyYV9kaXNjb3VudF90eXBlLFxuICAgICAgZXh0cmFfZGlzY291bnRfdmFsdWU6IG9yaWdpbmFsLmV4dHJhX2Rpc2NvdW50X3ZhbHVlLCByb3VuZF9vZmY6IG9yaWdpbmFsLnJvdW5kX29mZixcbiAgICAgIGJhbmtfaWQ6IG9yaWdpbmFsLmJhbmtfaWQsIHNpZ25hdHVyZV9pZDogb3JpZ2luYWwuc2lnbmF0dXJlX2lkLFxuICAgICAgc3VidG90YWw6IG9yaWdpbmFsLnN1YnRvdGFsLCBkaXNjb3VudF90b3RhbDogb3JpZ2luYWwuZGlzY291bnRfdG90YWwsXG4gICAgICB0YXhhYmxlX2Ftb3VudDogb3JpZ2luYWwudGF4YWJsZV9hbW91bnQsIGNnc3RfdG90YWw6IG9yaWdpbmFsLmNnc3RfdG90YWwsXG4gICAgICBzZ3N0X3RvdGFsOiBvcmlnaW5hbC5zZ3N0X3RvdGFsLCBpZ3N0X3RvdGFsOiBvcmlnaW5hbC5pZ3N0X3RvdGFsLFxuICAgICAgdGF4X3RvdGFsOiBvcmlnaW5hbC50YXhfdG90YWwsIGFkZGl0aW9uYWxfY2hhcmdlc190b3RhbDogb3JpZ2luYWwuYWRkaXRpb25hbF9jaGFyZ2VzX3RvdGFsLFxuICAgICAgZ3JhbmRfdG90YWw6IG9yaWdpbmFsLmdyYW5kX3RvdGFsLCBhbW91bnRfcGFpZDogMCwgYmFsYW5jZV9kdWU6IG9yaWdpbmFsLmdyYW5kX3RvdGFsLFxuICAgICAgc3RhdHVzOiAnZHJhZnQnLCBjcmVhdGVkX2J5OiB1aWQsXG4gICAgfTtcblxuICAgIGNvbnN0IHsgZGF0YTogY3JlYXRlZCwgZXJyb3I6IGluc2VydEVyciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnaW52b2ljZXMnKS5pbnNlcnQobmV3SW52KS5zZWxlY3QoKS5zaW5nbGUoKTtcbiAgICBpZiAoaW5zZXJ0RXJyKSByZXR1cm4gc2VuZCg1MDAsIHsgZXJyb3I6IGluc2VydEVyci5tZXNzYWdlIH0pO1xuXG4gICAgaWYgKG9yaWdpbmFsLml0ZW1zPy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IG5ld0l0ZW1zID0gb3JpZ2luYWwuaXRlbXMubWFwKGl0ZW0gPT4gKHtcbiAgICAgICAgaW52b2ljZV9pZDogY3JlYXRlZC5pZCwgcHJvZHVjdF9pZDogaXRlbS5wcm9kdWN0X2lkLCBuYW1lOiBpdGVtLm5hbWUsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBpdGVtLmRlc2NyaXB0aW9uLCBzaG93X2Rlc2NyaXB0aW9uOiBpdGVtLnNob3dfZGVzY3JpcHRpb24sXG4gICAgICAgIHF1YW50aXR5OiBpdGVtLnF1YW50aXR5LCB1bml0X3ByaWNlOiBpdGVtLnVuaXRfcHJpY2UsIHRheF9yYXRlOiBpdGVtLnRheF9yYXRlLFxuICAgICAgICBkaXNjb3VudF90eXBlOiBpdGVtLmRpc2NvdW50X3R5cGUsIGRpc2NvdW50X3ZhbHVlOiBpdGVtLmRpc2NvdW50X3ZhbHVlLFxuICAgICAgICBkaXNjb3VudF9hbW91bnQ6IGl0ZW0uZGlzY291bnRfYW1vdW50LCB0YXhfYW1vdW50OiBpdGVtLnRheF9hbW91bnQsXG4gICAgICAgIGxpbmVfdG90YWw6IGl0ZW0ubGluZV90b3RhbCwgc29ydF9vcmRlcjogaXRlbS5zb3J0X29yZGVyLFxuICAgICAgfSkpO1xuICAgICAgY29uc3QgeyBlcnJvcjogaXRlbXNFcnIgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2ludm9pY2VfaXRlbXMnKS5pbnNlcnQobmV3SXRlbXMpO1xuICAgICAgaWYgKGl0ZW1zRXJyKSByZXR1cm4gc2VuZCg1MDAsIHsgZXJyb3I6IGl0ZW1zRXJyLm1lc3NhZ2UgfSk7XG4gICAgfVxuXG4gICAgYXdhaXQgY3JlYXRlQXVkaXRMb2coJ2ludm9pY2VzJywgY3JlYXRlZC5pZCwgJ2NyZWF0ZWQnLCBudWxsLCBuZXdJbnYsIHVpZCk7XG4gICAgcmV0dXJuIHNlbmQoMjAxLCB7IGludm9pY2U6IGNyZWF0ZWQgfSk7XG4gIH1cblxuICAvLyA9PT09PSBQcmVmaXggU2V0dGluZ3MgKFN1cGFiYXNlKSA9PT09PVxuICBjb25zdCBwcmVmaXhUb1JvdyA9IChwKSA9PiAoe1xuICAgIHZhbHVlOiBwLnZhbHVlLFxuICAgIGRlc2NyaXB0aW9uOiBwLmRlc2NyaXB0aW9uID8/IG51bGwsXG4gICAgZG9jX3R5cGU6IHAuZG9jVHlwZSxcbiAgICBpc19hY3RpdmU6IHAuaXNBY3RpdmUgPz8gdHJ1ZSxcbiAgICBpc19kZWZhdWx0OiBwLmlzRGVmYXVsdCA/PyBmYWxzZSxcbiAgICBzZXF1ZW5jZV9vcmRlcjogcC5zZXF1ZW5jZU9yZGVyID8/IDEsXG4gIH0pO1xuICBjb25zdCBwcmVmaXhUb0FwaSA9IChyKSA9PiAoe1xuICAgIGlkOiByLmlkLFxuICAgIHZhbHVlOiByLnZhbHVlLFxuICAgIGRlc2NyaXB0aW9uOiByLmRlc2NyaXB0aW9uLFxuICAgIGRvY1R5cGU6IHIuZG9jX3R5cGUsXG4gICAgaXNBY3RpdmU6IHIuaXNfYWN0aXZlLFxuICAgIGlzRGVmYXVsdDogci5pc19kZWZhdWx0LFxuICAgIHNlcXVlbmNlT3JkZXI6IHIuc2VxdWVuY2Vfb3JkZXIsXG4gICAgY3JlYXRlZEF0OiByLmNyZWF0ZWRfYXQsXG4gICAgdXBkYXRlZEF0OiByLnVwZGF0ZWRfYXQsXG4gIH0pO1xuXG4gIGlmIChwYXRoID09PSAnL2FwaS9wcmVmaXgtc2V0dGluZ3MnICYmIG1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICBpZiAoIWNwKCdzZXR0aW5nczpyZWFkJykpIHJldHVybjtcbiAgICBsZXQgcSA9IGFkbWluQ2xpZW50LmZyb20oJ2RvY3VtZW50X3ByZWZpeGVzJykuc2VsZWN0KCcqJyk7XG4gICAgaWYgKHBhcnNlZC5kb2NUeXBlKSBxID0gcS5lcSgnZG9jX3R5cGUnLCBwYXJzZWQuZG9jVHlwZSk7XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgcS5vcmRlcignc2VxdWVuY2Vfb3JkZXInLCB7IGFzY2VuZGluZzogdHJ1ZSB9KTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICBsZXQgaXRlbXMgPSAoZGF0YSB8fCBbXSkubWFwKHByZWZpeFRvQXBpKTtcbiAgICBpZiAocGFyc2VkLmFjdGl2ZSA9PT0gJ3RydWUnKSBpdGVtcyA9IGl0ZW1zLmZpbHRlcihwID0+IHAuaXNBY3RpdmUgIT09IGZhbHNlKTtcbiAgICBpZiAocGFyc2VkLmRlZmF1bHQgPT09ICd0cnVlJykgaXRlbXMgPSBpdGVtcy5maWx0ZXIocCA9PiBwLmlzRGVmYXVsdCA9PT0gdHJ1ZSk7XG4gICAgaWYgKHBhcnNlZC5xKSB7XG4gICAgICBjb25zdCBzZWFyY2ggPSBwYXJzZWQucS50b0xvd2VyQ2FzZSgpO1xuICAgICAgaXRlbXMgPSBpdGVtcy5maWx0ZXIocCA9PiAocC52YWx1ZSB8fCAnJykudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhzZWFyY2gpIHx8IChwLmRlc2NyaXB0aW9uIHx8ICcnKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHNlYXJjaCkpO1xuICAgIH1cbiAgICBjb25zdCBzb3J0RmllbGQgPSBwYXJzZWQuc29ydEZpZWxkIHx8ICdzZXF1ZW5jZU9yZGVyJztcbiAgICBjb25zdCBzb3J0RGlyID0gcGFyc2VkLnNvcnREaXIgfHwgJ2FzYyc7XG4gICAgaXRlbXMgPSBbLi4uaXRlbXNdLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgIGNvbnN0IHZhID0gYVtzb3J0RmllbGRdID8/IDA7XG4gICAgICBjb25zdCB2YiA9IGJbc29ydEZpZWxkXSA/PyAwO1xuICAgICAgaWYgKHR5cGVvZiB2YSA9PT0gJ3N0cmluZycpIHJldHVybiBzb3J0RGlyID09PSAnZGVzYycgPyB2Yi5sb2NhbGVDb21wYXJlKHZhKSA6IHZhLmxvY2FsZUNvbXBhcmUodmIpO1xuICAgICAgcmV0dXJuIHNvcnREaXIgPT09ICdkZXNjJyA/IHZiIC0gdmEgOiB2YSAtIHZiO1xuICAgIH0pO1xuICAgIGNvbnN0IHBhZ2VTaXplID0gcGFyc2VJbnQocGFyc2VkLnBhZ2VTaXplLCAxMCkgfHwgMTA7XG4gICAgY29uc3QgcGFnZU51bSA9IHBhcnNlSW50KHBhcnNlZC5wYWdlLCAxMCkgfHwgMTtcbiAgICBjb25zdCB0b3RhbCA9IGl0ZW1zLmxlbmd0aDtcbiAgICBjb25zdCBwYWdlZCA9IGl0ZW1zLnNsaWNlKChwYWdlTnVtIC0gMSkgKiBwYWdlU2l6ZSwgcGFnZU51bSAqIHBhZ2VTaXplKTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgaXRlbXM6IHBhZ2VkLCB0b3RhbCB9KTtcbiAgfVxuXG4gIGlmIChwYXRoID09PSAnL2FwaS9wcmVmaXgtc2V0dGluZ3MnICYmIG1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgaWYgKCFjcCgnc2V0dGluZ3M6dXBkYXRlJykpIHJldHVybjtcbiAgICBjb25zdCByb3cgPSB7IC4uLnByZWZpeFRvUm93KHBhcnNlZCksIGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLCBjcmVhdGVkX2J5OiB1aWQgfTtcbiAgICBpZiAocm93LmlzX2RlZmF1bHQpIHtcbiAgICAgIGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2RvY3VtZW50X3ByZWZpeGVzJykudXBkYXRlKHsgaXNfZGVmYXVsdDogZmFsc2UgfSkuZXEoJ2RvY190eXBlJywgcm93LmRvY190eXBlKS5uZXEoJ2lkJywgcm93LmlkKTtcbiAgICB9XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnZG9jdW1lbnRfcHJlZml4ZXMnKS5pbnNlcnQocm93KS5zZWxlY3QoKS5zaW5nbGUoKTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDEsIHsgcHJlZml4OiBwcmVmaXhUb0FwaShkYXRhKSB9KTtcbiAgfVxuXG4gIGNvbnN0IHBzTWF0Y2gyID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3ByZWZpeC1zZXR0aW5nc1xcLyhbXi9dKykkLyk7XG4gIGlmIChwc01hdGNoMikge1xuICAgIGNvbnN0IGlkID0gcHNNYXRjaDJbMV07XG4gICAgaWYgKG1ldGhvZCA9PT0gJ1BVVCcpIHtcbiAgICAgIGlmICghY3AoJ3NldHRpbmdzOnVwZGF0ZScpKSByZXR1cm47XG4gICAgICBjb25zdCB1cGRhdGVzID0gcHJlZml4VG9Sb3cocGFyc2VkKTtcbiAgICAgIGlmICh1cGRhdGVzLmlzX2RlZmF1bHQpIHtcbiAgICAgICAgYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnZG9jdW1lbnRfcHJlZml4ZXMnKS51cGRhdGUoeyBpc19kZWZhdWx0OiBmYWxzZSB9KS5lcSgnZG9jX3R5cGUnLCB1cGRhdGVzLmRvY190eXBlKS5uZXEoJ2lkJywgaWQpO1xuICAgICAgfVxuICAgICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnZG9jdW1lbnRfcHJlZml4ZXMnKS51cGRhdGUodXBkYXRlcykuZXEoJ2lkJywgaWQpLnNlbGVjdCgpLnNpbmdsZSgpO1xuICAgICAgaWYgKGVycm9yIHx8ICFkYXRhKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdQcmVmaXggbm90IGZvdW5kLicgfSk7XG4gICAgICByZXR1cm4gc2VuZCgyMDAsIHsgcHJlZml4OiBwcmVmaXhUb0FwaShkYXRhKSB9KTtcbiAgICB9XG4gICAgaWYgKG1ldGhvZCA9PT0gJ0RFTEVURScpIHtcbiAgICAgIGlmICghY3AoJ3NldHRpbmdzOmRlbGV0ZScpKSByZXR1cm47XG4gICAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdkb2N1bWVudF9wcmVmaXhlcycpLmRlbGV0ZSgpLmVxKCdpZCcsIGlkKTtcbiAgICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgICAgcmV0dXJuIHNlbmQoMjAwLCB7IG9rOiB0cnVlIH0pO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHBzRGVmYXVsdE1hdGNoMiA9IHBhdGgubWF0Y2goL15cXC9hcGlcXC9wcmVmaXgtc2V0dGluZ3NcXC8oW14vXSspXFwvZGVmYXVsdCQvKTtcbiAgaWYgKHBzRGVmYXVsdE1hdGNoMikge1xuICAgIGlmIChtZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgaWYgKCFjcCgnc2V0dGluZ3M6dXBkYXRlJykpIHJldHVybjtcbiAgICAgIGNvbnN0IGlkID0gcHNEZWZhdWx0TWF0Y2gyWzFdO1xuICAgICAgY29uc3QgeyBkYXRhOiBjdXJyZW50IH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdkb2N1bWVudF9wcmVmaXhlcycpLnNlbGVjdCgnKicpLmVxKCdpZCcsIGlkKS5zaW5nbGUoKTtcbiAgICAgIGlmICghY3VycmVudCkgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnUHJlZml4IG5vdCBmb3VuZC4nIH0pO1xuICAgICAgYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnZG9jdW1lbnRfcHJlZml4ZXMnKS51cGRhdGUoeyBpc19kZWZhdWx0OiBmYWxzZSB9KS5lcSgnZG9jX3R5cGUnLCBjdXJyZW50LmRvY190eXBlKTtcbiAgICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2RvY3VtZW50X3ByZWZpeGVzJykudXBkYXRlKHsgaXNfZGVmYXVsdDogdHJ1ZSB9KS5lcSgnaWQnLCBpZCkuc2VsZWN0KCkuc2luZ2xlKCk7XG4gICAgICBpZiAoZXJyb3IgfHwgIWRhdGEpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ1ByZWZpeCBub3QgZm91bmQuJyB9KTtcbiAgICAgIHJldHVybiBzZW5kKDIwMCwgeyBwcmVmaXg6IHByZWZpeFRvQXBpKGRhdGEpIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vID09PT09IFN1ZmZpeCBTZXR0aW5ncyAoU3VwYWJhc2UpID09PT09XG4gIGNvbnN0IHN1ZmZpeFRvUm93ID0gKHApID0+ICh7XG4gICAgdmFsdWU6IHAudmFsdWUsXG4gICAgZGVzY3JpcHRpb246IHAuZGVzY3JpcHRpb24gPz8gbnVsbCxcbiAgICBkb2NfdHlwZTogcC5kb2NUeXBlLFxuICAgIGlzX2FjdGl2ZTogcC5pc0FjdGl2ZSA/PyB0cnVlLFxuICAgIGlzX2RlZmF1bHQ6IHAuaXNEZWZhdWx0ID8/IGZhbHNlLFxuICAgIHNlcXVlbmNlX29yZGVyOiBwLnNlcXVlbmNlT3JkZXIgPz8gMSxcbiAgfSk7XG4gIGNvbnN0IHN1ZmZpeFRvQXBpID0gKHIpID0+ICh7XG4gICAgaWQ6IHIuaWQsXG4gICAgdmFsdWU6IHIudmFsdWUsXG4gICAgZGVzY3JpcHRpb246IHIuZGVzY3JpcHRpb24sXG4gICAgZG9jVHlwZTogci5kb2NfdHlwZSxcbiAgICBpc0FjdGl2ZTogci5pc19hY3RpdmUsXG4gICAgaXNEZWZhdWx0OiByLmlzX2RlZmF1bHQsXG4gICAgc2VxdWVuY2VPcmRlcjogci5zZXF1ZW5jZV9vcmRlcixcbiAgICBjcmVhdGVkQXQ6IHIuY3JlYXRlZF9hdCxcbiAgICB1cGRhdGVkQXQ6IHIudXBkYXRlZF9hdCxcbiAgfSk7XG5cbiAgaWYgKHBhdGggPT09ICcvYXBpL3N1ZmZpeC1zZXR0aW5ncycgJiYgbWV0aG9kID09PSAnR0VUJykge1xuICAgIGlmICghY3AoJ3NldHRpbmdzOnJlYWQnKSkgcmV0dXJuO1xuICAgIGxldCBxID0gYWRtaW5DbGllbnQuZnJvbSgnZG9jdW1lbnRfc3VmZml4ZXMnKS5zZWxlY3QoJyonKTtcbiAgICBpZiAocGFyc2VkLmRvY1R5cGUpIHEgPSBxLmVxKCdkb2NfdHlwZScsIHBhcnNlZC5kb2NUeXBlKTtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBxLm9yZGVyKCdzZXF1ZW5jZV9vcmRlcicsIHsgYXNjZW5kaW5nOiB0cnVlIH0pO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIGxldCBpdGVtcyA9IChkYXRhIHx8IFtdKS5tYXAoc3VmZml4VG9BcGkpO1xuICAgIGlmIChwYXJzZWQuYWN0aXZlID09PSAndHJ1ZScpIGl0ZW1zID0gaXRlbXMuZmlsdGVyKHAgPT4gcC5pc0FjdGl2ZSAhPT0gZmFsc2UpO1xuICAgIGlmIChwYXJzZWQuZGVmYXVsdCA9PT0gJ3RydWUnKSBpdGVtcyA9IGl0ZW1zLmZpbHRlcihwID0+IHAuaXNEZWZhdWx0ID09PSB0cnVlKTtcbiAgICBpZiAocGFyc2VkLnEpIHtcbiAgICAgIGNvbnN0IHNlYXJjaCA9IHBhcnNlZC5xLnRvTG93ZXJDYXNlKCk7XG4gICAgICBpdGVtcyA9IGl0ZW1zLmZpbHRlcihwID0+IChwLnZhbHVlIHx8ICcnKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHNlYXJjaCkgfHwgKHAuZGVzY3JpcHRpb24gfHwgJycpLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoKSk7XG4gICAgfVxuICAgIGNvbnN0IHNvcnRGaWVsZCA9IHBhcnNlZC5zb3J0RmllbGQgfHwgJ3NlcXVlbmNlT3JkZXInO1xuICAgIGNvbnN0IHNvcnREaXIgPSBwYXJzZWQuc29ydERpciB8fCAnYXNjJztcbiAgICBpdGVtcyA9IFsuLi5pdGVtc10uc29ydCgoYSwgYikgPT4ge1xuICAgICAgY29uc3QgdmEgPSBhW3NvcnRGaWVsZF0gPz8gMDtcbiAgICAgIGNvbnN0IHZiID0gYltzb3J0RmllbGRdID8/IDA7XG4gICAgICBpZiAodHlwZW9mIHZhID09PSAnc3RyaW5nJykgcmV0dXJuIHNvcnREaXIgPT09ICdkZXNjJyA/IHZiLmxvY2FsZUNvbXBhcmUodmEpIDogdmEubG9jYWxlQ29tcGFyZSh2Yik7XG4gICAgICByZXR1cm4gc29ydERpciA9PT0gJ2Rlc2MnID8gdmIgLSB2YSA6IHZhIC0gdmI7XG4gICAgfSk7XG4gICAgY29uc3QgcGFnZVNpemUgPSBwYXJzZUludChwYXJzZWQucGFnZVNpemUsIDEwKSB8fCAxMDtcbiAgICBjb25zdCBwYWdlTnVtID0gcGFyc2VJbnQocGFyc2VkLnBhZ2UsIDEwKSB8fCAxO1xuICAgIGNvbnN0IHRvdGFsID0gaXRlbXMubGVuZ3RoO1xuICAgIGNvbnN0IHBhZ2VkID0gaXRlbXMuc2xpY2UoKHBhZ2VOdW0gLSAxKSAqIHBhZ2VTaXplLCBwYWdlTnVtICogcGFnZVNpemUpO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBpdGVtczogcGFnZWQsIHRvdGFsIH0pO1xuICB9XG5cbiAgaWYgKHBhdGggPT09ICcvYXBpL3N1ZmZpeC1zZXR0aW5ncycgJiYgbWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICBpZiAoIWNwKCdzZXR0aW5nczp1cGRhdGUnKSkgcmV0dXJuO1xuICAgIGNvbnN0IHJvdyA9IHsgLi4uc3VmZml4VG9Sb3cocGFyc2VkKSwgaWQ6IGNyeXB0by5yYW5kb21VVUlEKCksIGNyZWF0ZWRfYnk6IHVpZCB9O1xuICAgIGlmIChyb3cuaXNfZGVmYXVsdCkge1xuICAgICAgYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnZG9jdW1lbnRfc3VmZml4ZXMnKS51cGRhdGUoeyBpc19kZWZhdWx0OiBmYWxzZSB9KS5lcSgnZG9jX3R5cGUnLCByb3cuZG9jX3R5cGUpLm5lcSgnaWQnLCByb3cuaWQpO1xuICAgIH1cbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdkb2N1bWVudF9zdWZmaXhlcycpLmluc2VydChyb3cpLnNlbGVjdCgpLnNpbmdsZSgpO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMSwgeyBzdWZmaXg6IHN1ZmZpeFRvQXBpKGRhdGEpIH0pO1xuICB9XG5cbiAgY29uc3Qgc3NNYXRjaDIgPSBwYXRoLm1hdGNoKC9eXFwvYXBpXFwvc3VmZml4LXNldHRpbmdzXFwvKFteL10rKSQvKTtcbiAgaWYgKHNzTWF0Y2gyKSB7XG4gICAgY29uc3QgaWQgPSBzc01hdGNoMlsxXTtcbiAgICBpZiAobWV0aG9kID09PSAnUFVUJykge1xuICAgICAgaWYgKCFjcCgnc2V0dGluZ3M6dXBkYXRlJykpIHJldHVybjtcbiAgICAgIGNvbnN0IHVwZGF0ZXMgPSBzdWZmaXhUb1JvdyhwYXJzZWQpO1xuICAgICAgaWYgKHVwZGF0ZXMuaXNfZGVmYXVsdCkge1xuICAgICAgICBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdkb2N1bWVudF9zdWZmaXhlcycpLnVwZGF0ZSh7IGlzX2RlZmF1bHQ6IGZhbHNlIH0pLmVxKCdkb2NfdHlwZScsIHVwZGF0ZXMuZG9jX3R5cGUpLm5lcSgnaWQnLCBpZCk7XG4gICAgICB9XG4gICAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdkb2N1bWVudF9zdWZmaXhlcycpLnVwZGF0ZSh1cGRhdGVzKS5lcSgnaWQnLCBpZCkuc2VsZWN0KCkuc2luZ2xlKCk7XG4gICAgICBpZiAoZXJyb3IgfHwgIWRhdGEpIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ1N1ZmZpeCBub3QgZm91bmQuJyB9KTtcbiAgICAgIHJldHVybiBzZW5kKDIwMCwgeyBzdWZmaXg6IHN1ZmZpeFRvQXBpKGRhdGEpIH0pO1xuICAgIH1cbiAgICBpZiAobWV0aG9kID09PSAnREVMRVRFJykge1xuICAgICAgaWYgKCFjcCgnc2V0dGluZ3M6ZGVsZXRlJykpIHJldHVybjtcbiAgICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2RvY3VtZW50X3N1ZmZpeGVzJykuZGVsZXRlKCkuZXEoJ2lkJywgaWQpO1xuICAgICAgaWYgKGVycm9yKSByZXR1cm4gc2VuZCg1MDAsIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICByZXR1cm4gc2VuZCgyMDAsIHsgb2s6IHRydWUgfSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3Qgc3NEZWZhdWx0TWF0Y2gyID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL3N1ZmZpeC1zZXR0aW5nc1xcLyhbXi9dKylcXC9kZWZhdWx0JC8pO1xuICBpZiAoc3NEZWZhdWx0TWF0Y2gyKSB7XG4gICAgaWYgKG1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICBpZiAoIWNwKCdzZXR0aW5nczp1cGRhdGUnKSkgcmV0dXJuO1xuICAgICAgY29uc3QgaWQgPSBzc0RlZmF1bHRNYXRjaDJbMV07XG4gICAgICBjb25zdCB7IGRhdGE6IGN1cnJlbnQgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2RvY3VtZW50X3N1ZmZpeGVzJykuc2VsZWN0KCcqJykuZXEoJ2lkJywgaWQpLnNpbmdsZSgpO1xuICAgICAgaWYgKCFjdXJyZW50KSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdTdWZmaXggbm90IGZvdW5kLicgfSk7XG4gICAgICBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdkb2N1bWVudF9zdWZmaXhlcycpLnVwZGF0ZSh7IGlzX2RlZmF1bHQ6IGZhbHNlIH0pLmVxKCdkb2NfdHlwZScsIGN1cnJlbnQuZG9jX3R5cGUpO1xuICAgICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnZG9jdW1lbnRfc3VmZml4ZXMnKS51cGRhdGUoeyBpc19kZWZhdWx0OiB0cnVlIH0pLmVxKCdpZCcsIGlkKS5zZWxlY3QoKS5zaW5nbGUoKTtcbiAgICAgIGlmIChlcnJvciB8fCAhZGF0YSkgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnU3VmZml4IG5vdCBmb3VuZC4nIH0pO1xuICAgICAgcmV0dXJuIHNlbmQoMjAwLCB7IHN1ZmZpeDogc3VmZml4VG9BcGkoZGF0YSkgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gPT09PT0gRG9jdW1lbnQgTm90ZXMgKFN1cGFiYXNlKSA9PT09PVxuICBjb25zdCBub3RlVG9Sb3cgPSAobikgPT4gKHtcbiAgICBkb2NfdHlwZTogbi5kb2NUeXBlID8/IG51bGwsXG4gICAgdGl0bGU6IG4udGl0bGUgPz8gbnVsbCxcbiAgICBjb250ZW50OiBuLnRleHQgIT09IHVuZGVmaW5lZCA/IG4udGV4dCA6IChuLmNvbnRlbnQgPz8gbnVsbCksXG4gIH0pO1xuICBjb25zdCBub3RlVG9BcGkgPSAocikgPT4gKHtcbiAgICBpZDogci5pZCxcbiAgICBkb2NUeXBlOiByLmRvY190eXBlLFxuICAgIHRpdGxlOiByLnRpdGxlLFxuICAgIGNvbnRlbnQ6IHIuY29udGVudCxcbiAgICB0ZXh0OiByLmNvbnRlbnQsXG4gICAgY3JlYXRlZEF0OiByLmNyZWF0ZWRfYXQsXG4gICAgdXBkYXRlZEF0OiByLnVwZGF0ZWRfYXQsXG4gIH0pO1xuXG4gIGlmIChwYXRoID09PSAnL2FwaS9kb2N1bWVudC1ub3RlcycgJiYgbWV0aG9kID09PSAnR0VUJykge1xuICAgIGlmICghY3AoJ3NldHRpbmdzOnJlYWQnKSkgcmV0dXJuO1xuICAgIGxldCBxID0gYWRtaW5DbGllbnQuZnJvbSgnZG9jdW1lbnRfbm90ZXMnKS5zZWxlY3QoJyonKTtcbiAgICBpZiAocGFyc2VkLmRvY1R5cGUpIHEgPSBxLmVxKCdkb2NfdHlwZScsIHBhcnNlZC5kb2NUeXBlKTtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBxLm9yZGVyKCdjcmVhdGVkX2F0JywgeyBhc2NlbmRpbmc6IGZhbHNlIH0pO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIGxldCBpdGVtcyA9IChkYXRhIHx8IFtdKS5tYXAobm90ZVRvQXBpKTtcbiAgICBpZiAocGFyc2VkLnEpIHtcbiAgICAgIGNvbnN0IHNlYXJjaCA9IHBhcnNlZC5xLnRvTG93ZXJDYXNlKCk7XG4gICAgICBpdGVtcyA9IGl0ZW1zLmZpbHRlcihuID0+IChuLmNvbnRlbnQgfHwgJycpLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoKSB8fCAobi50aXRsZSB8fCAnJykudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhzZWFyY2gpKTtcbiAgICB9XG4gICAgY29uc3Qgc29ydEZpZWxkID0gcGFyc2VkLnNvcnRGaWVsZCB8fCAnY3JlYXRlZEF0JztcbiAgICBjb25zdCBzb3J0RGlyID0gcGFyc2VkLnNvcnREaXIgfHwgJ2Rlc2MnO1xuICAgIGl0ZW1zID0gWy4uLml0ZW1zXS5zb3J0KChhLCBiKSA9PiB7XG4gICAgICBjb25zdCB2YSA9IGFbc29ydEZpZWxkXSA/PyAwO1xuICAgICAgY29uc3QgdmIgPSBiW3NvcnRGaWVsZF0gPz8gMDtcbiAgICAgIGlmICh0eXBlb2YgdmEgPT09ICdzdHJpbmcnKSByZXR1cm4gc29ydERpciA9PT0gJ2Rlc2MnID8gdmIubG9jYWxlQ29tcGFyZSh2YSkgOiB2YS5sb2NhbGVDb21wYXJlKHZiKTtcbiAgICAgIHJldHVybiBzb3J0RGlyID09PSAnZGVzYycgPyB2YiAtIHZhIDogdmEgLSB2YjtcbiAgICB9KTtcbiAgICBjb25zdCBwYWdlU2l6ZSA9IHBhcnNlSW50KHBhcnNlZC5wYWdlU2l6ZSwgMTApIHx8IDEwO1xuICAgIGNvbnN0IHBhZ2VOdW0gPSBwYXJzZUludChwYXJzZWQucGFnZSwgMTApIHx8IDE7XG4gICAgY29uc3QgdG90YWwgPSBpdGVtcy5sZW5ndGg7XG4gICAgY29uc3QgcGFnZWQgPSBpdGVtcy5zbGljZSgocGFnZU51bSAtIDEpICogcGFnZVNpemUsIHBhZ2VOdW0gKiBwYWdlU2l6ZSk7XG4gICAgcmV0dXJuIHNlbmQoMjAwLCB7IGl0ZW1zOiBwYWdlZCwgdG90YWwgfSk7XG4gIH1cblxuICBpZiAocGF0aCA9PT0gJy9hcGkvZG9jdW1lbnQtbm90ZXMnICYmIG1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgaWYgKCFjcCgnc2V0dGluZ3M6dXBkYXRlJykpIHJldHVybjtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdkb2N1bWVudF9ub3RlcycpLmluc2VydCh7IC4uLm5vdGVUb1JvdyhwYXJzZWQpLCBpZDogY3J5cHRvLnJhbmRvbVVVSUQoKSwgY3JlYXRlZF9ieTogdWlkIH0pLnNlbGVjdCgpLnNpbmdsZSgpO1xuICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIHJldHVybiBzZW5kKDIwMSwgeyBub3RlOiBub3RlVG9BcGkoZGF0YSkgfSk7XG4gIH1cblxuICBjb25zdCBub3RlTWF0Y2gyID0gcGF0aC5tYXRjaCgvXlxcL2FwaVxcL2RvY3VtZW50LW5vdGVzXFwvKFteL10rKSQvKTtcbiAgaWYgKG5vdGVNYXRjaDIpIHtcbiAgICBjb25zdCBpZCA9IG5vdGVNYXRjaDJbMV07XG4gICAgaWYgKG1ldGhvZCA9PT0gJ1BVVCcpIHtcbiAgICAgIGlmICghY3AoJ3NldHRpbmdzOnVwZGF0ZScpKSByZXR1cm47XG4gICAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdkb2N1bWVudF9ub3RlcycpLnVwZGF0ZShub3RlVG9Sb3cocGFyc2VkKSkuZXEoJ2lkJywgaWQpLnNlbGVjdCgpLnNpbmdsZSgpO1xuICAgICAgaWYgKGVycm9yIHx8ICFkYXRhKSByZXR1cm4gc2VuZCg0MDQsIHsgZXJyb3I6ICdOb3RlIG5vdCBmb3VuZC4nIH0pO1xuICAgICAgcmV0dXJuIHNlbmQoMjAwLCB7IG5vdGU6IG5vdGVUb0FwaShkYXRhKSB9KTtcbiAgICB9XG4gICAgaWYgKG1ldGhvZCA9PT0gJ0RFTEVURScpIHtcbiAgICAgIGlmICghY3AoJ3NldHRpbmdzOmRlbGV0ZScpKSByZXR1cm47XG4gICAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdkb2N1bWVudF9ub3RlcycpLmRlbGV0ZSgpLmVxKCdpZCcsIGlkKTtcbiAgICAgIGlmIChlcnJvcikgcmV0dXJuIHNlbmQoNTAwLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgICAgcmV0dXJuIHNlbmQoMjAwLCB7IG9rOiB0cnVlIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vID09PT09IERvY3VtZW50IFRlcm1zIChTdXBhYmFzZSkgPT09PT1cbiAgY29uc3QgdGVybVRvUm93ID0gKHQpID0+ICh7XG4gICAgZG9jX3R5cGU6IHQuZG9jVHlwZSA/PyBudWxsLFxuICAgIHRpdGxlOiB0LnRpdGxlID8/IG51bGwsXG4gICAgY29udGVudDogdC50ZXh0ICE9PSB1bmRlZmluZWQgPyB0LnRleHQgOiAodC5jb250ZW50ID8/IG51bGwpLFxuICB9KTtcbiAgY29uc3QgdGVybVRvQXBpID0gKHIpID0+ICh7XG4gICAgaWQ6IHIuaWQsXG4gICAgZG9jVHlwZTogci5kb2NfdHlwZSxcbiAgICB0aXRsZTogci50aXRsZSxcbiAgICBjb250ZW50OiByLmNvbnRlbnQsXG4gICAgdGV4dDogci5jb250ZW50LFxuICAgIGNyZWF0ZWRBdDogci5jcmVhdGVkX2F0LFxuICAgIHVwZGF0ZWRBdDogci51cGRhdGVkX2F0LFxuICB9KTtcblxuICBpZiAocGF0aCA9PT0gJy9hcGkvZG9jdW1lbnQtdGVybXMnICYmIG1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICBpZiAoIWNwKCdzZXR0aW5nczpyZWFkJykpIHJldHVybjtcbiAgICBsZXQgcSA9IGFkbWluQ2xpZW50LmZyb20oJ2RvY3VtZW50X3Rlcm1zJykuc2VsZWN0KCcqJyk7XG4gICAgaWYgKHBhcnNlZC5kb2NUeXBlKSBxID0gcS5lcSgnZG9jX3R5cGUnLCBwYXJzZWQuZG9jVHlwZSk7XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgcS5vcmRlcignY3JlYXRlZF9hdCcsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICBsZXQgaXRlbXMgPSAoZGF0YSB8fCBbXSkubWFwKHRlcm1Ub0FwaSk7XG4gICAgaWYgKHBhcnNlZC5xKSB7XG4gICAgICBjb25zdCBzZWFyY2ggPSBwYXJzZWQucS50b0xvd2VyQ2FzZSgpO1xuICAgICAgaXRlbXMgPSBpdGVtcy5maWx0ZXIodCA9PiAodC5jb250ZW50IHx8ICcnKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHNlYXJjaCkgfHwgKHQudGl0bGUgfHwgJycpLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoKSk7XG4gICAgfVxuICAgIGNvbnN0IHNvcnRGaWVsZCA9IHBhcnNlZC5zb3J0RmllbGQgfHwgJ2NyZWF0ZWRBdCc7XG4gICAgY29uc3Qgc29ydERpciA9IHBhcnNlZC5zb3J0RGlyIHx8ICdkZXNjJztcbiAgICBpdGVtcyA9IFsuLi5pdGVtc10uc29ydCgoYSwgYikgPT4ge1xuICAgICAgY29uc3QgdmEgPSBhW3NvcnRGaWVsZF0gPz8gMDtcbiAgICAgIGNvbnN0IHZiID0gYltzb3J0RmllbGRdID8/IDA7XG4gICAgICBpZiAodHlwZW9mIHZhID09PSAnc3RyaW5nJykgcmV0dXJuIHNvcnREaXIgPT09ICdkZXNjJyA/IHZiLmxvY2FsZUNvbXBhcmUodmEpIDogdmEubG9jYWxlQ29tcGFyZSh2Yik7XG4gICAgICByZXR1cm4gc29ydERpciA9PT0gJ2Rlc2MnID8gdmIgLSB2YSA6IHZhIC0gdmI7XG4gICAgfSk7XG4gICAgY29uc3QgcGFnZVNpemUgPSBwYXJzZUludChwYXJzZWQucGFnZVNpemUsIDEwKSB8fCAxMDtcbiAgICBjb25zdCBwYWdlTnVtID0gcGFyc2VJbnQocGFyc2VkLnBhZ2UsIDEwKSB8fCAxO1xuICAgIGNvbnN0IHRvdGFsID0gaXRlbXMubGVuZ3RoO1xuICAgIGNvbnN0IHBhZ2VkID0gaXRlbXMuc2xpY2UoKHBhZ2VOdW0gLSAxKSAqIHBhZ2VTaXplLCBwYWdlTnVtICogcGFnZVNpemUpO1xuICAgIHJldHVybiBzZW5kKDIwMCwgeyBpdGVtczogcGFnZWQsIHRvdGFsIH0pO1xuICB9XG5cbiAgaWYgKHBhdGggPT09ICcvYXBpL2RvY3VtZW50LXRlcm1zJyAmJiBtZXRob2QgPT09ICdQT1NUJykge1xuICAgIGlmICghY3AoJ3NldHRpbmdzOnVwZGF0ZScpKSByZXR1cm47XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnZG9jdW1lbnRfdGVybXMnKS5pbnNlcnQoeyAuLi50ZXJtVG9Sb3cocGFyc2VkKSwgaWQ6IGNyeXB0by5yYW5kb21VVUlEKCksIGNyZWF0ZWRfYnk6IHVpZCB9KS5zZWxlY3QoKS5zaW5nbGUoKTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDEsIHsgdGVybTogdGVybVRvQXBpKGRhdGEpIH0pO1xuICB9XG5cbiAgY29uc3QgdGVybU1hdGNoMiA9IHBhdGgubWF0Y2goL15cXC9hcGlcXC9kb2N1bWVudC10ZXJtc1xcLyhbXi9dKykkLyk7XG4gIGlmICh0ZXJtTWF0Y2gyKSB7XG4gICAgY29uc3QgaWQgPSB0ZXJtTWF0Y2gyWzFdO1xuICAgIGlmIChtZXRob2QgPT09ICdQVVQnKSB7XG4gICAgICBpZiAoIWNwKCdzZXR0aW5nczp1cGRhdGUnKSkgcmV0dXJuO1xuICAgICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnZG9jdW1lbnRfdGVybXMnKS51cGRhdGUodGVybVRvUm93KHBhcnNlZCkpLmVxKCdpZCcsIGlkKS5zZWxlY3QoKS5zaW5nbGUoKTtcbiAgICAgIGlmIChlcnJvciB8fCAhZGF0YSkgcmV0dXJuIHNlbmQoNDA0LCB7IGVycm9yOiAnVGVybSBub3QgZm91bmQuJyB9KTtcbiAgICAgIHJldHVybiBzZW5kKDIwMCwgeyB0ZXJtOiB0ZXJtVG9BcGkoZGF0YSkgfSk7XG4gICAgfVxuICAgIGlmIChtZXRob2QgPT09ICdERUxFVEUnKSB7XG4gICAgICBpZiAoIWNwKCdzZXR0aW5nczpkZWxldGUnKSkgcmV0dXJuO1xuICAgICAgY29uc3QgeyBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnZG9jdW1lbnRfdGVybXMnKS5kZWxldGUoKS5lcSgnaWQnLCBpZCk7XG4gICAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICAgIHJldHVybiBzZW5kKDIwMCwgeyBvazogdHJ1ZSB9KTtcbiAgICB9XG4gIH1cblxuICAvLyA9PT09PSBQcm9kdWN0IENvbHVtbnMgKFN1cGFiYXNlKSA9PT09PVxuICBjb25zdCBjb2x1bW5Ub0FwaSA9IChjKSA9PiAoe1xuICAgIGlkOiBjLmlkLFxuICAgIGtleTogYy5rZXksXG4gICAgbGFiZWw6IGMubGFiZWwsXG4gICAgYWx3YXlzOiBjLmFsd2F5cyxcbiAgICBkZWZhdWx0VmlzaWJsZTogYy5kZWZhdWx0X3Zpc2libGUsXG4gICAgd2lkdGg6IGMud2lkdGgsXG4gICAgcGVybWlzc2lvbjogYy5wZXJtaXNzaW9uLFxuICAgIGRpc3BsYXlPcmRlcjogYy5kaXNwbGF5X29yZGVyLFxuICB9KTtcblxuICBpZiAocGF0aCA9PT0gJy9hcGkvcHJvZHVjdC1jb2x1bW5zJyAmJiBtZXRob2QgPT09ICdHRVQnKSB7XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYWRtaW5DbGllbnQuZnJvbSgnaW52b2ljZV90YWJsZV9jb2x1bW5zJykuc2VsZWN0KCcqJykub3JkZXIoJ2Rpc3BsYXlfb3JkZXInLCB7IGFzY2VuZGluZzogdHJ1ZSB9KTtcbiAgICBpZiAoZXJyb3IpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc2VuZCgyMDAsIHsgY29sdW1uczogKGRhdGEgfHwgW10pLm1hcChjb2x1bW5Ub0FwaSkgfSk7XG4gIH1cblxuICBpZiAocGF0aCA9PT0gJy9hcGkvcHJvZHVjdC1jb2x1bW5zJyAmJiBtZXRob2QgPT09ICdQVVQnKSB7XG4gICAgaWYgKCFjcCgnc2V0dGluZ3M6dXBkYXRlJykpIHJldHVybjtcbiAgICBjb25zdCBjb2x1bW5zID0gcGFyc2VkLmNvbHVtbnMgfHwgW107XG4gICAgY29uc3QgeyBlcnJvcjogZGVsRXJyIH0gPSBhd2FpdCBhZG1pbkNsaWVudC5mcm9tKCdpbnZvaWNlX3RhYmxlX2NvbHVtbnMnKS5kZWxldGUoKS5uZXEoJ2lkJywgJzAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCcpO1xuICAgIGlmIChkZWxFcnIpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogZGVsRXJyLm1lc3NhZ2UgfSk7XG4gICAgaWYgKGNvbHVtbnMubGVuZ3RoKSB7XG4gICAgICBjb25zdCByb3dzID0gY29sdW1ucy5tYXAoKGMpID0+ICh7XG4gICAgICAgIGlkOiBjLmlkIHx8IGNyeXB0by5yYW5kb21VVUlEKCksXG4gICAgICAgIGtleTogYy5rZXksXG4gICAgICAgIGxhYmVsOiBjLmxhYmVsLFxuICAgICAgICBhbHdheXM6IGMuYWx3YXlzID8/IGZhbHNlLFxuICAgICAgICBkZWZhdWx0X3Zpc2libGU6IGMuZGVmYXVsdFZpc2libGUgPz8gZmFsc2UsXG4gICAgICAgIHdpZHRoOiBjLndpZHRoID8/IG51bGwsXG4gICAgICAgIHBlcm1pc3Npb246IGMucGVybWlzc2lvbiA/PyBudWxsLFxuICAgICAgICBkaXNwbGF5X29yZGVyOiBjLmRpc3BsYXlPcmRlciA/PyAxLFxuICAgICAgICBjcmVhdGVkX2J5OiB1aWQsXG4gICAgICB9KSk7XG4gICAgICBjb25zdCB7IGVycm9yOiBpbnNFcnIgfSA9IGF3YWl0IGFkbWluQ2xpZW50LmZyb20oJ2ludm9pY2VfdGFibGVfY29sdW1ucycpLmluc2VydChyb3dzKTtcbiAgICAgIGlmIChpbnNFcnIpIHJldHVybiBzZW5kKDUwMCwgeyBlcnJvcjogaW5zRXJyLm1lc3NhZ2UgfSk7XG4gICAgfVxuICAgIHJldHVybiBzZW5kKDIwMCwgeyBvazogdHJ1ZSB9KTtcbiAgfVxuXG4gIHJldHVybiBzZW5kKDQwNCwgeyBlcnJvcjogJ05vdCBmb3VuZC4nIH0pO1xufVxuXG4vLyBTaGFyZWQgaW52b2ljZS1udW1iZXIgc2VxdWVuY2UgaGVscGVyLiBJbmNyZW1lbnRzIHRoZSBudW1lcmljIHRhaWwgb2YgdGhlXG4vLyBsYXN0IGludm9pY2UgbnVtYmVyIHRoYXQgc2hhcmVzIHRoZSBzYW1lIHByZWZpeCAoZS5nLiBJTlYtMDAwNyAtPiBJTlYtMDAwOCkuXG5mdW5jdGlvbiBuZXh0SW52b2ljZU51bWJlcihwcmVmaXgsIGxhc3ROdW1iZXIpIHtcbiAgY29uc3QgUEFEID0gNDtcbiAgbGV0IHNlcSA9IDE7XG4gIGlmIChsYXN0TnVtYmVyKSB7XG4gICAgY29uc3QgdGFpbCA9IFN0cmluZyhsYXN0TnVtYmVyKS5yZXBsYWNlKHByZWZpeCwgJycpO1xuICAgIGNvbnN0IG4gPSBwYXJzZUludCh0YWlsLnJlcGxhY2UoL1xcRC9nLCAnJyksIDEwKTtcbiAgICBpZiAoIU51bWJlci5pc05hTihuKSkgc2VxID0gbiArIDE7XG4gIH1cbiAgcmV0dXJuIGAke3ByZWZpeH0ke1N0cmluZyhzZXEpLnBhZFN0YXJ0KFBBRCwgJzAnKX1gO1xufVxuXG5sZXQgX2FkbWluU3VwYWJhc2UgPSBudWxsO1xuYXN5bmMgZnVuY3Rpb24gYWRtaW5TdXBhYmFzZSgpIHtcbiAgaWYgKF9hZG1pblN1cGFiYXNlKSByZXR1cm4gX2FkbWluU3VwYWJhc2U7XG4gIGNvbnN0IHsgY3JlYXRlQ2xpZW50IH0gPSBhd2FpdCBpbXBvcnQoJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcycpO1xuICBjb25zdCB7IGNvbmZpZyB9ID0gYXdhaXQgaW1wb3J0KCcuLi9zcmMvY29uZmlnL2luZGV4LmpzJyk7XG4gIC8vIFRoZSBzZXJ2aWNlIHJvbGUga2V5IGlzIGEgZnVsbC1hZG1pbiBzZWNyZXQgYW5kIG11c3QgTkVWRVIgYmUgcmVhZCBmcm9tXG4gIC8vIHRoZSBjbGllbnQgYnVuZGxlLiBJdCBjb21lcyBleGNsdXNpdmVseSBmcm9tIHRoZSBkZXBsb3ltZW50IHBsYXRmb3JtJ3NcbiAgLy8gcHJvY2Vzcy5lbnYgdmlhIHRoZSBzZXJ2ZXItb25seSBhY2Nlc3Nvci4gU2VlIHNyYy9jb25maWcvc2VydmVyU2VjcmV0cy5qcy5cbiAgY29uc3QgeyBnZXRTdXBhYmFzZVNlcnZpY2VSb2xlS2V5IH0gPSBhd2FpdCBpbXBvcnQoJy4uL3NyYy9jb25maWcvc2VydmVyU2VjcmV0cy5qcycpO1xuICBjb25zdCBzZXJ2aWNlUm9sZUtleSA9IGdldFN1cGFiYXNlU2VydmljZVJvbGVLZXkoKTtcbiAgaWYgKCFzZXJ2aWNlUm9sZUtleSkge1xuICAgIHRocm93IG5ldyBFcnJvcignU3VwYWJhc2Ugc2VydmljZSByb2xlIGtleSBpcyBub3QgY29uZmlndXJlZCBvbiB0aGUgc2VydmVyIChwcm9jZXNzLmVudi5TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZKS4gQWRtaW5pc3RyYXRpdmUgQVBJIG9wZXJhdGlvbnMgcmVxdWlyZSBpdC4nKTtcbiAgfVxuICBfYWRtaW5TdXBhYmFzZSA9IGNyZWF0ZUNsaWVudChjb25maWcuc3VwYWJhc2VVcmwsIHNlcnZpY2VSb2xlS2V5LCB7XG4gICAgYXV0aDogeyBhdXRvUmVmcmVzaFRva2VuOiBmYWxzZSwgcGVyc2lzdFNlc3Npb246IGZhbHNlIH0sXG4gIH0pO1xuICByZXR1cm4gX2FkbWluU3VwYWJhc2U7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkg6XFxcXGNvZGVcXFxcQ29yZVhcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkg6XFxcXGNvZGVcXFxcQ29yZVhcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0g6L2NvZGUvQ29yZVgvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgYXBpUGx1Z2luIGZyb20gJy4vc2VydmVyL3BsdWdpbi5qcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpLCBhcGlQbHVnaW4oKV0sXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgZXh0ZXJuYWw6IFsncGcnLCAnc3FsaXRlMycsICdzcWxpdGUnXSxcbiAgICB9LFxuICB9LFxufSk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkg6XFxcXGNvZGVcXFxcQ29yZVhcXFxcc2VydmVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJIOlxcXFxjb2RlXFxcXENvcmVYXFxcXHNlcnZlclxcXFxwbHVnaW4uanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0g6L2NvZGUvQ29yZVgvc2VydmVyL3BsdWdpbi5qc1wiO2ltcG9ydCB7IGxvYWRFbnYgfSBmcm9tICd2aXRlJztcblxubGV0IGRiID0gbnVsbDtcblxuYXN5bmMgZnVuY3Rpb24gZW5zdXJlRGIobW9kZSkge1xuICBpZiAoZGIpIHJldHVybiBkYjtcbiAgY29uc3Qgdml0ZUVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgJ1ZJVEVfJyk7XG4gIGNvbnN0IHNlcnZlckVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgJycpO1xuICBPYmplY3QuYXNzaWduKHByb2Nlc3MuZW52LCB2aXRlRW52LCBzZXJ2ZXJFbnYpO1xuXG4gIGlmICh2aXRlRW52LlZJVEVfU1VQQUJBU0VfVVJMICYmIHZpdGVFbnYuVklURV9TVVBBQkFTRV9BTk9OX0tFWSkge1xuICAgIGNvbnN0IHsgaW5pdERhdGFiYXNlIH0gPSBhd2FpdCBpbXBvcnQoJy4uL3NyYy9kYXRhL2luZGV4LmpzJyk7XG4gICAgZGIgPSBhd2FpdCBpbml0RGF0YWJhc2Uodml0ZUVudi5WSVRFX0RBVEFCQVNFX1BST1ZJREVSIHx8ICdzdXBhYmFzZScsIHtcbiAgICAgIHVybDogdml0ZUVudi5WSVRFX1NVUEFCQVNFX1VSTCxcbiAgICAgIGFub25LZXk6IHZpdGVFbnYuVklURV9TVVBBQkFTRV9BTk9OX0tFWSxcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBtZW1vcnlTdG9yZSA9IG5ldyBNYXAoKTtcbiAgICBkYiA9IHtcbiAgICAgIGlzU3VwYWJhc2U6IGZhbHNlLFxuICAgICAgc3VwYWJhc2U6IG51bGwsXG4gICAgICBzZXR0aW5nczoge1xuICAgICAgICBnZXRBbGw6IGFzeW5jICgpID0+IHtcbiAgICAgICAgICBjb25zdCBhbGwgPSB7fTtcbiAgICAgICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBtZW1vcnlTdG9yZSkgYWxsW2tdID0gdjtcbiAgICAgICAgICByZXR1cm4gYWxsO1xuICAgICAgICB9LFxuICAgICAgICB1cGRhdGU6IGFzeW5jICh1cGRhdGVzKSA9PiB7XG4gICAgICAgICAgZm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXModXBkYXRlcykpIG1lbW9yeVN0b3JlLnNldChrLCB2KTtcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuICByZXR1cm4gZGI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGFwaVBsdWdpbigpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnY29yZXgtYXBpJyxcbiAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICBpZiAocmVxLnVybC5zdGFydHNXaXRoKCcvYXBpLycpKSB7XG4gICAgICAgICAgY29uc3QgZGJhc2UgPSBhd2FpdCBlbnN1cmVEYihzZXJ2ZXIuY29uZmlnLm1vZGUpO1xuICAgICAgICAgIGNvbnN0IHsgaGFuZGxlQXBpUmVxdWVzdCB9ID0gYXdhaXQgaW1wb3J0KCcuL2FwaS5qcycpO1xuICAgICAgICAgIGhhbmRsZUFwaVJlcXVlc3QocmVxLCByZXMsIGRiYXNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sXG4gIH07XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFxR08sU0FBUyxvQkFBb0I7QUFDbEMsU0FBTyxDQUFDLEVBQUUsT0FBTyxlQUFlLE9BQU87QUFDekM7QUF2R0EsSUFBcVE7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TSxDQUFDO0FBQ2IscUJBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxZQUFhLEtBQUksQ0FBQyxJQUFJO0FBQzNDLGlCQUFPO0FBQUEsUUFDVDtBQUFBLFFBQ0EsUUFBUSxPQUFPLFlBQVk7QUFDekIscUJBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxPQUFPLFFBQVEsT0FBTyxFQUFHLGFBQVksSUFBSSxHQUFHLENBQUM7QUFBQSxRQUNwRTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNBLFNBQU87QUFDVDtBQUVlLFNBQVIsWUFBNkI7QUFDbEMsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sZ0JBQWdCLFFBQVE7QUFDdEIsYUFBTyxZQUFZLElBQUksT0FBT0MsTUFBSyxLQUFLLFNBQVM7QUFDL0MsWUFBSUEsS0FBSSxJQUFJLFdBQVcsT0FBTyxHQUFHO0FBQy9CLGdCQUFNLFFBQVEsTUFBTSxTQUFTLE9BQU8sT0FBTyxJQUFJO0FBQy9DLGdCQUFNLEVBQUUsa0JBQUFDLGtCQUFpQixJQUFJLE1BQU07QUFDbkMsVUFBQUEsa0JBQWlCRCxNQUFLLEtBQUssS0FBSztBQUFBLFFBQ2xDLE9BQU87QUFDTCxlQUFLO0FBQUEsUUFDUDtBQUFBLE1BQ0YsQ0FBQztBQUFBLElBQ0g7QUFBQSxFQUNGO0FBQ0Y7OztBRC9DQSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQztBQUFBLEVBQzlCLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLGVBQWU7QUFBQSxNQUNiLFVBQVUsQ0FBQyxNQUFNLFdBQVcsUUFBUTtBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbImRiIiwgImRiIiwgInJlcSIsICJkYiIsICJhdWRpdFNlcnZpY2UiLCAiY29uZmlnIiwgImdldFN1cGFiYXNlU2VydmljZVJvbGVLZXkiLCAiaW5pdERhdGFiYXNlIiwgInJlcSIsICJoYW5kbGVBcGlSZXF1ZXN0Il0KfQo=
