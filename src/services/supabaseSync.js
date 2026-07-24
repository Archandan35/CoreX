const PW_DELIM = ':';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(v) { return UUID_RE.test(v); }

const env = {
  url: import.meta.env?.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
  serviceKey: import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY || '',
};

function getSession() {
  try {
    const raw = localStorage.getItem('sb_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setSession(session) {
  try {
    if (session) {
      localStorage.setItem('sb_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('sb_session');
    }
  } catch {}
}

export function configure(config) {
  if (config?.url) env.url = config.url.replace(/\/$/, '');
  if (config?.anonKey) env.anonKey = config.anonKey;
  if (config?.serviceKey) env.serviceKey = config.serviceKey;
  try {
    sessionStorage.setItem('sb_cfg', JSON.stringify({ url: env.url, anonKey: env.anonKey, serviceKey: env.serviceKey }));
  } catch {}
}

try {
  const saved = JSON.parse(sessionStorage.getItem('sb_cfg') || 'null');
  if (saved?.url) {
    if (saved.url) env.url = saved.url;
    if (saved.anonKey) env.anonKey = saved.anonKey;
    if (saved.serviceKey) env.serviceKey = saved.serviceKey;
  }
} catch {}

function isConfigured() {
  return !!(env.url && (env.anonKey || env.serviceKey));
}

function encodePassword(salt, hash) {
  return `${salt}${PW_DELIM}${hash}`;
}

function decodePassword(encoded) {
  if (!encoded) return { salt: '', passwordHash: '' };
  const idx = encoded.indexOf(PW_DELIM);
  if (idx > 0) {
    return { salt: encoded.slice(0, idx), passwordHash: encoded.slice(idx + 1) };
  }
  return { salt: '', passwordHash: encoded };
}

export function mapToSupabaseUser(user) {
  const record = {};
  if (user.id && isUUID(user.id)) record.id = user.id;
  record.email = user.email;
  record.name = user.name;
  record.role = user.roleCode || user.role || '';
  record.status = (user.status || 'active').toLowerCase();
  if (user.createdAt) record.created_at = user.createdAt;
  return record;
}

export function mapFromSupabaseUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    username: row.email ? row.email.split('@')[0] : '',
    phone: row.phone || '',
    address: row.address || '',
    roleCode: row.role,
    extraRoles: row.extra_roles || [],
    grants: [],
    denies: [],
    status: row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Active',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapToSupabaseRole(role) {
  const rec = {
    ...(role.id && isUUID(role.id) ? { id: role.id } : {}),
    name: role.name,
    code: role.code || role.name,
    description: role.description || '',
    permissions: role.permissions || [],
    all: !!role.all,
    inherits: role.inherits || [],
    system: !!role.system,
    status: role.status || 'Active',
    created_at: role.createdAt || new Date().toISOString(),
  };
  return rec;
}

export function mapFromSupabaseRole(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code || row.name,
    name: row.name,
    description: row.description || '',
    permissions: row.permissions || [],
    all: !!row.all,
    inherits: row.inherits || [],
    system: !!row.system,
    status: row.status || 'Active',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function serviceHeaders() {
  const key = env.serviceKey || env.anonKey;
  return {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: 'return=representation',
  };
}

function authHeaders() {
  const session = getSession();
  const token = session?.access_token;
  if (token) {
    return {
      'Content-Type': 'application/json',
      apikey: env.anonKey,
      Authorization: `Bearer ${token}`,
    };
  }
  const key = env.serviceKey || env.anonKey;
  return {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

async function supabaseServiceFetch(path, method, body = null) {
  if (!isConfigured()) return null;
  const res = await fetch(`${env.url}/rest/v1/${path}`, {
    method,
    headers: serviceHeaders(),
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    console.warn(`[SupabaseSync] ${method} ${path} failed:`, err);
    throw new Error(err.message || err.error || `${method} ${path} failed: ${res.status}`);
  }
  if (method === 'DELETE') return true;
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

async function supabaseGet(path, useServiceKey = false) {
  if (!isConfigured()) return null;
  try {
    const headers = useServiceKey ? serviceHeaders() : authHeaders();
    const res = await fetch(`${env.url}/rest/v1/${path}`, { headers });
    if (!res.ok) {
      console.warn(`[SupabaseSync] GET ${path} failed: ${res.status} ${res.statusText}`);
      return null;
    }
    return res.json();
  } catch (e) {
    console.warn(`[SupabaseSync] GET ${path} error:`, e);
    return null;
  }
}

async function authFetch(path, method, body = null) {
  if (!isConfigured()) return null;
  const key = env.anonKey;
  const res = await fetch(`${env.url}/auth/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    console.warn(`[SupabaseSync] Auth ${method} ${path} failed:`, err);
    throw new Error(err.message || err.error || `Auth ${method} ${path} failed: ${res.status}`);
  }
  return res.json();
}

async function authAdminFetch(path, method, body = null) {
  if (!isConfigured()) return null;
  const key = env.serviceKey;
  if (!key) throw new Error('Service role key required for admin auth operations.');
  const res = await fetch(`${env.url}/auth/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    console.warn(`[SupabaseSync] Auth Admin ${method} ${path} failed:`, err);
    throw new Error(err.msg || err.message || err.error || `Auth Admin ${method} ${path} failed: ${res.status}`);
  }
  return res.json();
}

export const supabaseSync = {
  configure,

  // === Supabase Auth methods ===

  async signUp(email, password, userData = {}) {
    const result = await authFetch('signup', 'POST', {
      email,
      password,
      data: { name: userData.name || '' },
    });
    return result;
  },

  async signIn(email, password) {
    const result = await authFetch('token?grant_type=password', 'POST', {
      email,
      password,
    });
    const session = {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
      expires_at: result.expires_at || Date.now() + (result.expires_in || 3600) * 1000,
      user: result.user,
    };
    setSession(session);
    return session;
  },

  async signOut() {
    const session = getSession();
    if (session?.access_token) {
      try {
        await fetch(`${env.url}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            apikey: env.anonKey,
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      } catch {}
    }
    setSession(null);
  },

  getSession,

  async getCurrentUser() {
    const session = getSession();
    if (!session?.access_token) return null;
    try {
      const res = await fetch(`${env.url}/auth/v1/user`, {
        headers: {
          apikey: env.anonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  },

  async createAuthUser(email, password, userData = {}) {
    return authAdminFetch('admin/users', 'POST', {
      email,
      password,
      email_confirm: true,
      user_metadata: { name: userData.name || '' },
    });
  },

  async deleteAuthUser(uid) {
    try {
      await authAdminFetch(`admin/users/${uid}`, 'DELETE');
      return true;
    } catch { return false; }
  },

  // === Existing CRUD methods (use service key for admin operations, auth headers for user operations) ===

  async createUser(userData) {
    return supabaseServiceFetch('users', 'POST', mapToSupabaseUser(userData));
  },

  async findUserByEmail(email) {
    if (!isConfigured()) return null;
    const encoded = encodeURIComponent(email.toLowerCase());
    const data = await supabaseGet(`users?email=eq.${encoded}&limit=1`);
    if (!data) return null;
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return row ? mapFromSupabaseUser(row) : null;
  },

  async listUsers() {
    if (!isConfigured()) return [];
    const data = await supabaseGet('users?select=*');
    return (Array.isArray(data) ? data : []).map(mapFromSupabaseUser);
  },

  async createRole(roleData) {
    return supabaseServiceFetch('roles', 'POST', mapToSupabaseRole(roleData));
  },

  async listRoles() {
    if (!isConfigured()) return [];
    const data = await supabaseGet('roles?select=*');
    return (Array.isArray(data) ? data : []).map(mapFromSupabaseRole);
  },

  async updateRole(id, patch) {
    const body = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.code !== undefined) body.code = patch.code;
    if (patch.description !== undefined) body.description = patch.description;
    if (patch.permissions !== undefined) body.permissions = patch.permissions;
    if (patch.all !== undefined) body.all = patch.all;
    if (patch.inherits !== undefined) body.inherits = patch.inherits;
    if (patch.system !== undefined) body.system = patch.system;
    if (patch.status !== undefined) body.status = patch.status;
    if (patch.createdAt !== undefined) body.created_at = patch.createdAt;
    return supabaseServiceFetch(`roles?id=eq.${encodeURIComponent(id)}`, 'PATCH', body);
  },

  async deleteRole(id) {
    try {
      await supabaseServiceFetch(`roles?id=eq.${encodeURIComponent(id)}`, 'DELETE');
      return true;
    } catch { return false; }
  },

  async updateUser(id, patch) {
    const body = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.email !== undefined) body.email = patch.email;
    if (patch.roleCode !== undefined) body.role = patch.roleCode;
    if (patch.status !== undefined) body.status = patch.status.toLowerCase();
    if (patch.phone !== undefined) body.phone = patch.phone;
    return supabaseServiceFetch(`users?id=eq.${encodeURIComponent(id)}`, 'PATCH', body);
  },

  async deleteUser(id) {
    try {
      await supabaseServiceFetch(`users?id=eq.${encodeURIComponent(id)}`, 'DELETE');
      return true;
    } catch { return false; }
  },

  isConfigured,

  async hasAnyUser() {
    try {
      const key = env.anonKey || env.serviceKey;
      if (!key) return true;
      const res = await fetch(`${env.url}/rest/v1/rpc/is_first_install`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      if (!res.ok) return true;
      const isFirst = await res.json();
      return !isFirst;
    } catch {
      return true;
    }
  },

  async hasAdminUser() {
    try {
      if (!isConfigured()) return false;
      const res = await fetch(`${env.url}/rest/v1/rpc/has_admin_user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.anonKey,
          Authorization: `Bearer ${env.anonKey}`,
        },
        body: '{}',
      });
      if (res.ok) return (await res.json()) === true;
      return false;
    } catch {
      return false;
    }
  },

  async checkSchemaExists() {
    try {
      if (!isConfigured()) return false;
      const res = await fetch(`${env.url}/rest/v1/rpc/is_first_install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.anonKey,
          Authorization: `Bearer ${env.anonKey}`,
        },
        body: '{}',
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};

export default supabaseSync;