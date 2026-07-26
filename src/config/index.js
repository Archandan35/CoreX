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
    return typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_SUPABASE_BUCKET
      : typeof process !== 'undefined' && process.env
        ? process.env.VITE_SUPABASE_BUCKET
        : undefined;
  },
  get appUrl() {
    const envUrl = (typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_APP_URL
      : typeof process !== 'undefined' && process.env
        ? process.env.VITE_APP_URL
        : undefined);

    const hasWindow = typeof window !== 'undefined' && window.location && window.location.origin;
    const actualOrigin = hasWindow ? window.location.origin : null;

    // The redirect URL for auth emails MUST point at where the app is ACTUALLY
    // running — that is where the user's browser is right now, and that is where
    // the confirmation link has to bring them back to. A common production bug
    // is shipping with VITE_APP_URL still set to http://localhost:3000 (copied
    // from .env.example); if we preferred envUrl unconditionally, the
    // confirmation email would redirect users to localhost in production and
    // break the flow. So:
    //   - If a browser origin is available, it is the ground truth. We only
    //     prefer a configured envUrl when it is consistent with (a prefix of)
    //     the real origin, OR when there is no browser to compare against.
    //   - A localhost envUrl is never trusted outside an actual localhost
    //     origin, which kills the "redirects to localhost in production" defect
    //     at the root, regardless of how .env is configured.
    if (actualOrigin) {
      const normalizedEnv = envUrl ? String(envUrl).replace(/\/$/, '') : null;
      const envIsConsistent = !!normalizedEnv && actualOrigin.startsWith(normalizedEnv);
      const envIsLocalhost = !!normalizedEnv && /^https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(normalizedEnv);
      const actualIsLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(actualOrigin);
      if (envIsConsistent) return normalizedEnv;
      // env disagrees with the real origin, OR env is localhost while actually
      // deployed → use the real origin. This is the production-safe choice and
      // kills the "redirects to localhost in production" defect at the root.
      if (!envIsLocalhost || actualIsLocalhost) return actualOrigin;
      return actualOrigin;
    }

    // No browser (SSR / Node / tests) — fall back to env, then a sane default.
    return envUrl || 'http://localhost:3000';
  },
});

export function isSupabaseEnabled() {
  return !!(config.supabaseUrl && config.supabaseAnonKey);
}
