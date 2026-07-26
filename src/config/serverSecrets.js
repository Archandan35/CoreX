// Server-only secret accessors.
//
// These values come from the deployment platform's environment (process.env)
// and must NEVER be exposed to the browser bundle. They are deliberately in a
// separate module from `src/config/index.js` (which is imported by client
// code) so that no static `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY`
// reference can pull the secret into the client build. Only server-side code
// (server/api.js, the Vite dev server plugin) imports this module.
//
// Note on the env var name: the deployment platform supplies the Supabase
// service role key under the project's environment. We accept either the
// non-prefixed name SUPABASE_SERVICE_ROLE_KEY (the standard Supabase CI/CD
// convention) or the legacy VITE_SUPABASE_SERVICE_ROLE_KEY for backward
// compatibility with existing deployments — but because this module reads via
// `process.env` (server runtime) rather than `import.meta.env` (build-time
// client inlining), neither name leaks into the browser bundle.
export function getSupabaseServiceRoleKey() {
  if (typeof process === 'undefined') return undefined;
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    undefined
  );
}
