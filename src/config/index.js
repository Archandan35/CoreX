export const config = Object.freeze({
  get authProvider() {
    return typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_AUTH_PROVIDER
      : typeof process !== 'undefined' && process.env
        ? process.env.VITE_AUTH_PROVIDER
        : undefined;
  },
  get databaseProvider() {
    return typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_DATABASE_PROVIDER
      : typeof process !== 'undefined' && process.env
        ? process.env.VITE_DATABASE_PROVIDER
        : undefined;
  },
  get storageProvider() {
    return typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_STORAGE_PROVIDER
      : typeof process !== 'undefined' && process.env
        ? process.env.VITE_STORAGE_PROVIDER
        : undefined;
  },
  get storageRootFolder() {
    return typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_STORAGE_ROOT_FOLDER
      : typeof process !== 'undefined' && process.env
        ? process.env.VITE_STORAGE_ROOT_FOLDER
        : undefined;
  },
  get supabaseUrl() {
    return typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_SUPABASE_URL
      : typeof process !== 'undefined' && process.env
        ? process.env.VITE_SUPABASE_URL
        : undefined;
  },
  get supabaseAnonKey() {
    return typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_SUPABASE_ANON_KEY
      : typeof process !== 'undefined' && process.env
        ? process.env.VITE_SUPABASE_ANON_KEY
        : undefined;
  },
  get supabaseServiceRoleKey() {
    return typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      : typeof process !== 'undefined' && process.env
        ? process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
        : undefined;
  },
  get supabaseBucket() {
    return typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_SUPABASE_BUCKET
      : typeof process !== 'undefined' && process.env
        ? process.env.VITE_SUPABASE_BUCKET
        : undefined;
  },
  get appUrl() {
    return (
      (typeof import.meta !== 'undefined' && import.meta.env
        ? import.meta.env.VITE_APP_URL
        : typeof process !== 'undefined' && process.env
          ? process.env.VITE_APP_URL
          : undefined) ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    );
  },
});

export function isSupabaseEnabled() {
  return !!(config.supabaseUrl && config.supabaseAnonKey);
}
