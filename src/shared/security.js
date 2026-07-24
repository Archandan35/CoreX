export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '::ueaf-salt');
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  return 'sha256:' + hex;
}

export async function verifyPassword(password, hash) {
  const hashed = await hashPassword(password);
  return hashed === hash;
}

export function generateSalt(length = 32) {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(36).padStart(2, '0')).join('');
}

export async function encrypt(text, key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key.padEnd(32, '0')).slice(0, 32), { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, data);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(ciphertext, key) {
  try {
    const encoder = new TextEncoder();
    const data = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);
    const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key.padEnd(32, '0')).slice(0, 32), { name: 'AES-GCM' }, false, ['decrypt']);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, encrypted);
    return new TextDecoder().decode(decrypted);
  } catch { return null; }
}

export function generateCSRFToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const token = Array.from(arr, b => b.toString(36).padStart(2, '0')).join('');
  return token;
}

export function validateCSRFToken(token, storedToken) {
  if (!token || !storedToken) return false;
  if (token.length !== storedToken.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  return diff === 0;
}

export function sanitizeHTML(input) {
  if (typeof input !== 'string') return input;
  return input.replace(/[&<>"'/]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '/': '&#x2F;',
  })[c]);
}

export function sanitizeSQL(input) {
  if (typeof input !== 'string') return input;
  return input.replace(/[';\\]/g, '');
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateUUID(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

export function escapeShell(arg) {
  return `'${String(arg).replace(/'/g, "'\\''")}'`;
}

export class RLS {
  constructor() { this._policies = {}; }

  definePolicy(table, policyFn) {
    if (!this._policies[table]) this._policies[table] = [];
    this._policies[table].push(policyFn);
  }

  evaluate(table, user, operation, row) {
    const policies = this._policies[table] || [];
    for (const policy of policies) {
      if (!policy(user, operation, row)) return false;
    }
    return true;
  }

  canSelect(table, user, row) { return this.evaluate(table, user, 'select', row); }
  canInsert(table, user, row) { return this.evaluate(table, user, 'insert', row); }
  canUpdate(table, user, row) { return this.evaluate(table, user, 'update', row); }
  canDelete(table, user, row) { return this.evaluate(table, user, 'delete', row); }
}

export const rls = new RLS();

rls.definePolicy('users', (user, op, row) => {
  if (user.permissions?.includes('*')) return true;
  if (op === 'select') return true;
  if (op === 'update' || op === 'delete') return row?.id === user.id || user.permissions?.includes('user.edit');
  if (op === 'insert') return user.permissions?.includes('user.create');
  return false;
});

rls.definePolicy('roles', (user, op) => {
  if (user.permissions?.includes('*')) return true;
  if (op === 'select') return user.permissions?.includes('role.list');
  return user.permissions?.includes('role.edit');
});

rls.definePolicy('settings', (user, op) => {
  if (op === 'select') return user.permissions?.includes('setting.view');
  return user.permissions?.includes('setting.edit');
});

export class SessionManager {
  constructor() { this._refreshTimers = new Map(); }

  createSession(user, expiresInMs = 3600000) {
    const session = {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions },
      token: generateCSRFToken(),
      refreshToken: generateCSRFToken(),
      createdAt: Date.now(),
      expiresAt: Date.now() + expiresInMs,
    };
    return session;
  }

  isExpired(session) {
    return !session || Date.now() > session.expiresAt;
  }

  refreshSession(session, expiresInMs = 3600000) {
    return { ...session, token: generateCSRFToken(), expiresAt: Date.now() + expiresInMs };
  }

  scheduleRefresh(sessionId, callback, expiresInMs = 3000000) {
    this.clearRefresh(sessionId);
    const timer = setTimeout(callback, expiresInMs - 60000);
    this._refreshTimers.set(sessionId, timer);
  }

  clearRefresh(sessionId) {
    if (this._refreshTimers.has(sessionId)) {
      clearTimeout(this._refreshTimers.get(sessionId));
      this._refreshTimers.delete(sessionId);
    }
  }
}

export const sessionManager = new SessionManager();

export class SecretsManager {
  constructor() { this._vault = new Map(); }

  set(key, value) { this._vault.set(key, value); }
  get(key) { return this._vault.get(key) || null; }
  has(key) { return this._vault.has(key); }
  delete(key) { this._vault.delete(key); }
  clear() { this._vault.clear(); }
}

export const secrets = new SecretsManager();

export function validateFile(file, options = {}) {
  const { maxSize = 10485760, allowedTypes = [], allowedExtensions = [] } = options;
  const errors = [];
  if (maxSize && file.size > maxSize) errors.push(`File exceeds ${(maxSize / 1048576).toFixed(0)}MB limit`);
  if (allowedTypes.length && !allowedTypes.includes(file.type)) errors.push(`File type ${file.type} is not allowed`);
  const ext = file.name?.split('.').pop()?.toLowerCase();
  if (allowedExtensions.length && ext && !allowedExtensions.includes(ext)) errors.push(`.${ext} files are not allowed`);
  return { valid: errors.length === 0, errors };
}

export function generateCSP(directives = {}) {
  const defaultDirectives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'https:'],
    'connect-src': ["'self'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };
  const merged = { ...defaultDirectives, ...directives };
  return Object.entries(merged).map(([key, vals]) => `${key} ${vals.join(' ')}`).join('; ');
}
