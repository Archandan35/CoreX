import { generateId, generateToken } from '../utils/id';
import { entityMapper } from '../shared/mapper';
import { serialize, deserialize } from '../shared/serializer';

export default class FetchProvider {
  constructor(config) {
    this.baseUrl = config?.baseUrl || import.meta.env?.VITE_SUPABASE_URL || '/api';
    this.headers = {
      'Content-Type': 'application/json',
      ...config?.headers,
    };
    this._listeners = {};
    this._subIdCounter = 0;
  }

  async _request(method, path, body = null, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const token = this._getToken();
    const headers = { ...this.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const config = { method, headers, ...options };
    if (body && method !== 'GET') config.body = JSON.stringify(serialize(body));
    const response = await fetch(url, config);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }
    const data = await response.json();
    return deserialize(data);
  }

  _getToken() {
    try {
      const oldSession = JSON.parse(sessionStorage.getItem('session') || 'null');
      if (oldSession?.token) return oldSession.token;
    } catch {}
    try {
      const sbSession = JSON.parse(localStorage.getItem('sb_session') || 'null');
      if (sbSession?.access_token) return sbSession.access_token;
    } catch {}
    return null;
  }

  async init() {
    const health = await this.health().catch(() => null);
    return !!health;
  }

  async signIn({ email, password }) {
    const data = await this._request('POST', '/auth/signin', { email, password });
    const user = entityMapper.map(data.user || data, 'user:response', 'user:entity');
    const session = { user, token: data.token || generateToken(), expiresAt: Date.now() + 86400000 };
    sessionStorage.setItem('session', JSON.stringify(session));
    return session;
  }

  async signOut() {
    await this._request('POST', '/auth/signout').catch(() => {});
    sessionStorage.removeItem('session');
    return true;
  }

  async getCurrentUser() {
    try {
      const data = await this._request('GET', '/auth/me');
      return entityMapper.map(data, 'user:response', 'user:entity');
    } catch { return null; }
  }

  async getSession() {
    try {
      const raw = sessionStorage.getItem('session');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  async findMany(resource, query = {}) {
    const params = new URLSearchParams();
    if (query.page) params.set('page', query.page);
    if (query.pageSize) params.set('pageSize', query.pageSize);
    if (query.sortBy) params.set('sortBy', query.sortBy);
    if (query.sortDir) params.set('sortDir', query.sortDir);
    if (query.search) params.set('search', query.search);
    if (query.filters) {
      for (const [key, val] of Object.entries(query.filters)) {
        if (val) params.set(`filter[${key}]`, val);
      }
    }
    const qs = params.toString();
    return this._request('GET', `/${resource}${qs ? '?' + qs : ''}`);
  }

  async findById(resource, id) {
    return this._request('GET', `/${resource}/${id}`);
  }

  async create(resource, data) {
    return this._request('POST', `/${resource}`, data);
  }

  async update(resource, id, data) {
    return this._request('PUT', `/${resource}/${id}`, data);
  }

  async delete(resource, id) {
    return this._request('DELETE', `/${resource}/${id}`);
  }

  async createMany(resource, items) {
    return this._request('POST', `/${resource}/batch`, items);
  }

  async updateMany(resource, ids, data) {
    return this._request('PUT', `/${resource}/batch`, { ids, data });
  }

  async deleteMany(resource, ids) {
    return this._request('DELETE', `/${resource}/batch`, { ids });
  }

  async search(resource, query, options = {}) {
    const params = new URLSearchParams({ q: query, ...options });
    return this._request('GET', `/${resource}/search?${params}`);
  }

  async upload(path, file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    const token = this._getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${this.baseUrl}/storage/upload`, {
      method: 'POST', headers, body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  }

  async getFileUrl(path) {
    return `${this.baseUrl}/storage/${encodeURIComponent(path)}`;
  }

  async deleteFile(path) {
    return this._request('DELETE', `/storage/${encodeURIComponent(path)}`);
  }

  subscribe(resource, callback) {
    const id = ++this._subIdCounter;
    if (!this._listeners[resource]) this._listeners[resource] = {};
    this._listeners[resource][id] = callback;
    return id;
  }

  unsubscribe(id) {
    for (const resource of Object.keys(this._listeners)) {
      if (this._listeners[resource][id]) {
        delete this._listeners[resource][id];
        return true;
      }
    }
    return false;
  }

  async health() {
    return this._request('GET', '/health');
  }

  async isFirstInstall() {
    const supabaseUrl = this.baseUrl || import.meta.env?.VITE_SUPABASE_URL;
    const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl) return true;
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/is_first_install`, {
        method: 'POST',
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) return true;
      const data = await res.json();
      return data === true;
    } catch {
      return true;
    }
  }

  async runMigrations() {
    return this._request('POST', '/migrations/run');
  }
}
