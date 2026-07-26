import { config } from '../../config/index.js';
import { isMissingTableError } from '../../utils/dbErrors.js';

let supabaseClient = null;

// Safely extract a human-readable message from any error shape (Error
// instance, Supabase AuthError/PostgrestError, plain object, string, or
// something unexpected). Guards against blank/uninformative values —
// including an error object whose own enumerable-properties stringify to
// "{}" — so the UI never shows an empty or unreadable error to the user.
function describeError(err, fallback) {
  if (!err) return fallback;
  if (typeof err === 'string') return err.trim() || fallback;

  // Always log the raw error so a real root cause is never silently lost
  // behind a generic message — this was the reason earlier reports of
  // "Account creation failed. Please try again." were undiagnosable: the
  // underlying Supabase error was discarded instead of surfaced anywhere.
  if (typeof console !== 'undefined' && console.error) {
    console.error('[auth] raw error:', err);
  }

  const candidate = err.message || err.error_description || err.msg || err.hint || err.details;
  if (typeof candidate === 'string' && candidate.trim() && candidate.trim() !== '{}' && candidate.trim() !== '[object Object]') {
    return candidate.trim();
  }

  // Fall back to well-known Supabase error identifiers (status/name/code)
  // before giving up with the generic fallback — some AuthRetryableFetchError
  // / network-layer failures carry no usable `message` but do carry these.
  if (err.status === 0 || err.name === 'AuthRetryableFetchError') {
    return 'Could not reach the authentication server. Check your connection and try again.';
  }
  if (err.status === 429 || err.code === 'over_email_send_rate_limit') {
    return 'Too many attempts. Please wait a moment before trying again.';
  }
  if (err.status && err.name) {
    return `${fallback} (${err.name}, status ${err.status})`;
  }

  return fallback;
}

async function getClient() {
  if (supabaseClient) return supabaseClient;
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    // Fail with a clear, actionable message instead of letting
    // createClient(undefined, undefined) produce a cryptic downstream error.
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then reload the app before creating an account.');
  }
  const { createClient } = await import('@supabase/supabase-js');
  supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
  return supabaseClient;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INCONSISTENT_ACCOUNT_ERROR =
  'Your account could not be fully set up (missing profile record). Please contact an administrator — do not retry registration with the same email.';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The application must never allow an authenticated user without a matching
// public.users record (see Issue 1). public.users is populated by the
// `handle_new_user()` DB trigger on auth.users, which runs inside the same
// transaction as the auth signup — so it is atomic on the database side.
// However PostgREST's schema cache can lag a moment behind a write, so we
// poll briefly for the row rather than failing on the very first read.
async function fetchProfileRecord(client, userId, { retries = 5, delayMs = 400 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { data, error } = await client
      .from('users')
      .select('id, email, full_access, role_label, permissions')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) return { record: data, error: null };
    if (error && !isMissingTableError(error) && error.code !== 'PGRST116') {
      // A real error (not "not found yet") — stop polling, surface it.
      return { record: null, error };
    }
    if (attempt < retries) await sleep(delayMs);
  }
  return { record: null, error: null };
}

export async function supabaseLogin(identifier, password) {
  if (!EMAIL_PATTERN.test((identifier || '').trim())) {
    return { ok: false, error: 'Please sign in with your email address.' };
  }
  try {
    const client = await getClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: identifier,
      password,
    });
    if (error) return { ok: false, error: describeError(error, 'Sign in failed. Please try again.') };

    const { data: userData, error: profileError } = await client
      .from('users')
      .select('full_access, role_label, permissions')
      .eq('id', data.user.id)
      .maybeSingle();

    // Permanent validation rule: never allow an authenticated session for a
    // user that exists in auth.users but has no matching public.users record.
    if (!userData || profileError) {
      await client.auth.signOut();
      return { ok: false, error: INCONSISTENT_ACCOUNT_ERROR };
    }

    return {
      ok: true,
      user: {
        id: data.user.id,
        name: data.user.user_metadata?.name || data.user.email,
        email: data.user.email,
        role_label: userData?.role_label || data.user.user_metadata?.role_label || '',
        full_access: userData?.full_access === true,
        permissions: userData?.permissions || data.user.user_metadata?.permissions || [],
      },
      token: data.session.access_token,
    };
  } catch (err) {
    return { ok: false, error: describeError(err, 'Sign in failed. Please try again.') };
  }
}

export async function supabaseRegister(payload) {
  try {
    const client = await getClient();

    const { data, error } = await client.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          name: payload.name,
          phone: payload.phone,
          role_label: payload.role_label || '',
          full_access: payload.full_access === true,
          permissions: payload.permissions || [],
        },
        // Never hard-code an environment URL — always resolve from the active
        // environment configuration (env var, falling back to the current
        // origin). See src/config/index.js `appUrl`.
        emailRedirectTo: `${config.appUrl}/login`,
      },
    });

    if (error) return { ok: false, error: describeError(error, 'Account creation failed. Please try again.') };
    if (!data.user) return { ok: false, error: 'Account creation failed. No user returned.' };

    // Supabase deliberately does NOT return an error when signUp() is called
    // with an email that is already registered — to avoid leaking which
    // emails exist, it responds with a 200 and a "fake" user object that has
    // an empty `identities` array and no new session. Without this check the
    // code below would treat that response as a brand-new account, either
    // reporting false success ("check your email") or misattributing an
    // existing user's profile to this registration attempt.
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0 && !data.session) {
      return {
        ok: false,
        error: 'An account with this email already exists. Please sign in instead, or use "Forgot password" if you don\'t remember your credentials.',
      };
    }

    // ---- Post-registration verification (Issue 1) ----
    // Auth user creation and the public.users profile insert happen atomically
    // in the database via the `handle_new_user()` trigger, but the client must
    // still verify the outcome before treating registration as successful —
    // never continue into the app on the strength of the auth user alone.
    const { record: profile, error: profileError } = await fetchProfileRecord(client, data.user.id);

    if (profileError || !profile) {
      // Auth user exists but the application profile does not. This is exactly
      // the forbidden state described in Issue 1. We cannot delete the auth
      // user from the client (that requires the service role key), so we make
      // sure no session is left active and surface an explicit error instead
      // of silently continuing into the app with a partial account.
      if (data.session) await client.auth.signOut();
      return { ok: false, error: INCONSISTENT_ACCOUNT_ERROR };
    }

    if (profile.id !== data.user.id || !profile.email) {
      if (data.session) await client.auth.signOut();
      return { ok: false, error: INCONSISTENT_ACCOUNT_ERROR };
    }

    // If this was expected to create the first administrator account, verify
    // administrator authority was actually assigned before continuing.
    if (payload.is_first_account && profile.full_access !== true) {
      if (data.session) await client.auth.signOut();
      return {
        ok: false,
        error: 'Administrator authority could not be verified for the first account. Please contact support before retrying.',
      };
    }

    // Email confirmation enabled — no session returned. Since email
    // confirmation is required, the user is not allowed in yet, but the
    // profile record itself has already been verified above.
    if (!data.session) {
      return {
        ok: true,
        user: null,
        token: null,
        notice: 'Account created. Please check your email to confirm your account before signing in.',
      };
    }

    // Email confirmation disabled — session returned, user can log in
    // immediately, using the verified profile record as the source of truth.
    return {
      ok: true,
      user: {
        id: data.user.id,
        name: payload.name,
        email: profile.email,
        role_label: profile.role_label || payload.role_label || '',
        full_access: profile.full_access === true,
        permissions: profile.permissions || payload.permissions || [],
      },
      token: data.session.access_token,
      notice: null,
    };
  } catch (err) {
    // Anything unexpected (misconfigured client, network failure, a thrown
    // non-Error value, etc.) is normalized here so the UI always gets a
    // readable message instead of an empty/opaque error.
    return { ok: false, error: describeError(err, 'Registration failed. Please try again.') };
  }
}

export async function supabaseLogout() {
  const client = await getClient();
  await client.auth.signOut();
}

export async function checkAdminExists() {
  const client = await getClient();
  try {
    const { data, error } = await client.rpc('check_admin_exists');
    if (!error) return { exists: data === true };
  } catch { }
  const { data, error } = await client
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('full_access', true)
    .limit(1);
  if (error) return { exists: false, error: describeError(error, 'Could not check for an existing administrator.') };
  return { exists: (data?.length || 0) > 0 };
}

export async function restoreSession() {
  const client = await getClient();
  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData?.session) return null;

  const userId = sessionData.session.user.id;
  const metadata = sessionData.session.user.user_metadata || {};

  const { data: userData, error: profileError } = await client
    .from('users')
    .select('full_access, role_label, permissions')
    .eq('id', userId)
    .maybeSingle();

  // Permanent validation rule: a restored session must never be honored if
  // the matching public.users record is missing — sign the user out instead
  // of silently continuing with a partial/default identity.
  if (!userData || profileError) {
    await client.auth.signOut();
    return null;
  }

  return {
    id: userId,
    name: metadata.name || sessionData.session.user.email,
    email: sessionData.session.user.email,
    role_label: userData?.role_label || metadata.role_label || '',
    full_access: userData?.full_access === true,
    permissions: userData?.permissions || metadata.permissions || [],
  };
}

export async function checkDatabaseReady() {
  const client = await getClient();
  try {
    const { data, error } = await client.from('users').select('id').limit(1);
    return { ready: !error, error: error?.message };
  } catch (err) {
    return { ready: false, error: err.message };
  }
}