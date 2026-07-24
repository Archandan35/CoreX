let cache = {
  allowRegistration: true,
  siteTitle: 'Universal Enterprise Application',
  logoUrl: '',
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: false,
};

export const settingsService = {
  async getAll() {
    return { ...cache };
  },

  async get(key, defaultValue = null) {
    if (cache[key] !== undefined) return cache[key];
    return defaultValue;
  },

  async set(key, value) {
    cache[key] = value;
    return { ok: true };
  },

  async updateMany(settings) {
    cache = { ...cache, ...settings };
    return { ok: true };
  },

  clearCache() {
    cache = {};
  },
};

export default settingsService;