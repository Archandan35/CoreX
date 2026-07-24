import FetchProvider from './fetch-provider';

let provider = null;

const env = () => ({
  url: import.meta.env?.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
});

const PROVIDER = {
  async init(config) {
    const baseUrl = config?.baseUrl || env().url || '';

    if (!baseUrl) {
      provider = null;
      return false;
    }

    provider = new FetchProvider({ baseUrl, ...config });
    return provider.init();
  },

  getProvider() {
    if (!provider) throw new Error('Data provider not initialized.');
    return provider;
  },

  setProvider(customProvider) {
    provider = customProvider;
  },

  async signIn(credentials) {
    if (!provider) return null;
    return provider.signIn(credentials);
  },
  async signOut() {
    if (!provider) return null;
    return provider.signOut();
  },
  async getCurrentUser() {
    if (!provider) return null;
    return provider.getCurrentUser();
  },
  async getSession() {
    if (!provider) return null;
    return provider.getSession();
  },

  async findMany(resource, query) {
    if (!provider) return [];
    return provider.findMany(resource, query);
  },
  async findById(resource, id) {
    if (!provider) return null;
    return provider.findById(resource, id);
  },
  async create(resource, data) {
    if (!provider) return null;
    return provider.create(resource, data);
  },
  async update(resource, id, data) {
    if (!provider) return null;
    return provider.update(resource, id, data);
  },
  async delete(resource, id) {
    if (!provider) return null;
    return provider.delete(resource, id);
  },

  async createMany(resource, items) {
    if (!provider) return [];
    return provider.createMany(resource, items);
  },
  async updateMany(resource, ids, data) {
    if (!provider) return null;
    return provider.updateMany(resource, ids, data);
  },
  async deleteMany(resource, ids) {
    if (!provider) return null;
    return provider.deleteMany(resource, ids);
  },

  async search(resource, query, options) {
    if (!provider) return [];
    return provider.search(resource, query, options);
  },

  async upload(path, file) {
    if (!provider) throw new Error('Provider not initialized');
    return provider.upload(path, file);
  },
  async getFileUrl(path) {
    if (!provider) return '';
    return provider.getFileUrl(path);
  },
  async deleteFile(path) {
    if (!provider) return null;
    return provider.deleteFile(path);
  },

  subscribe(resource, callback) {
    if (!provider) return -1;
    return provider.subscribe(resource, callback);
  },
  unsubscribe(subscriptionId) {
    if (!provider) return false;
    return provider.unsubscribe(subscriptionId);
  },

  async health() {
    if (!provider) return null;
    return provider.health();
  },
  async isFirstInstall() {
    try {
      const { url, anonKey } = env();
      if (!url) return true;
      const res = await fetch(`${url}/rest/v1/rpc/is_first_install`, {
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
  },
};

export default PROVIDER;
