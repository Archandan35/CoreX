import { config } from '../../config/index.js';
import { getSupabaseClient } from './supabaseClient.js';

const AUTH_REDIRECT_TYPE = (() => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  const search = window.location.search;
  if (hash.includes('access_token=')) return 'implicit';
  if (search.includes('code=')) return 'pkce';
  return null;
})();

const DEBUG_AUTH =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) ||
  (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'prod');

function describeError(err, fallback) {
  if (!err) return fallback;
  if (typeof err === 'string') return err.trim() || fallback;
  if (DEBUG_AUTH && typeof console !== 'undefined' && console.error) {
    console.error('[auth] raw error:', err);
  }
  if (err.status === 0 || err.name === 'AuthRetryableFetchError') {
    return 'Could not reach the authentication server. Check your connection.';
  }
  if (err.status === 429 || err.code === 'over_email_send_rate_limit') {
    return 'Signup is temporarily rate-limited. Please wait a few minutes.';
  }
  const msg = err.message || err.error_description || err.msg || err.hint || err.details;
  if (typeof msg === 'string' && msg.trim() && msg.trim() !== '{}' && msg.trim() !== '[object Object]') {
    return msg.trim();
  }
  if (err.status && err.name) {
    return `${fallback} (${err.name}, status ${err.status})`;
  }
  return fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildUser(record, meta) {
  return {
    id: record.id || '',
    email: record.email || '',
    name: record.name || meta?.name || record.email?.split('@')[0] || '',
    username: record.username || meta?.username || '',
    role_label: record.role_label || meta?.role_label || '',
    full_access: record.full_access === true,
    permissions: record.permissions || meta?.permissions || [],
  };
}

function buildPayload(id, email, meta) {
  return {
    id,
    email,
    name: meta?.name || email.split('@')[0],
    role_label: meta?.role_label || '',
    full_access: meta?.full_access === true,
    permissions: meta?.permissions || [],
    status: 'active',
  };
}

async function fetchProfile(client, userId) {
  const { data, error } = await client.from('users').select('*').eq('id', userId).maybeSingle();
  if (!error && data) return data;
  return null;
}

async function insertProfile(client, payload) {
  const { error } = await client.from('users').insert(payload);
  return error || null;
}

async function signIn(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: describeError(error, 'Sign in failed.') };
  return { ok: true, data };
}

async function signUp(client, payload) {
  const { data, error } = await client.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        name: payload.name,
        username: payload.username || '',
        phone: payload.phone || '',
        role_label: payload.role_label || '',
        full_access: payload.full_access === true,
        permissions: payload.permissions || [],
      },
      emailRedirectTo: `${config.appUrl}/login`,
    },
  });
  if (error) return { ok: false, error: describeError(error, 'Registration failed.') };
  if (!data.user) return { ok: false, error: 'Registration failed. No user returned.' };
  return { ok: true, data };
}

export async function supabaseLogin(identifier, password) {
  const trimmed = (identifier || '').trim();
  if (!trimmed) return { ok: false, error: 'Please enter your email, username, or phone number.' };

  try {
    const client = await getSupabaseClient();

    let email = '';
    const isEmail = EMAIL_PATTERN.test(trimmed);
    const isPhone = /^\d{10}$/.test(trimmed);
    const isUsername = !isEmail && !isPhone;

    if (isEmail) {
      email = trimmed;
    } else if (isPhone) {
      const { data: d, error: e } = await client.from('users').select('email').eq('phone', trimmed).maybeSingle();
      if (e || !d) return { ok: false, error: 'No account found with that phone number.' };
      email = d.email;
    } else {
      const { data: d, error: e } = await client.from('users').select('email').eq('username', trimmed.toLowerCase()).maybeSingle();
      if (e || !d) return { ok: false, error: 'No account found with that username.' };
      email = d.email;
    }

    const signInResult = await signIn(client, email, password);
    if (!signInResult.ok) return signInResult;

    const { data: authData } = signInResult;
    let record = await fetchProfile(client, authData.user.id);

    if (!record) {
      const payload = buildPayload(authData.user.id, authData.user.email, authData.user.user_metadata);
      const insertError = await insertProfile(client, payload);
      if (!insertError) record = await fetchProfile(client, authData.user.id);
    }

    if (!record) {
      await client.auth.signOut();
      return { ok: false, error: 'Your account profile was not found. The database schema may be incomplete — if you are the administrator, please run the Setup Wizard from the banner above.' };
    }

    return {
      ok: true,
      user: buildUser(record, authData.user.user_metadata),
      token: authData.session.access_token,
    };
  } catch (err) {
    return { ok: false, error: describeError(err, 'Sign in failed.') };
  }
}

export async function supabaseRegister(payload) {
  try {
    const client = await getSupabaseClient();

    if (payload.username) {
      payload.username = payload.username.trim().toLowerCase();
      const { data: existing } = await client.from('users').select('username').eq('username', payload.username).maybeSingle();
      if (existing) return { ok: false, error: 'Username already exists. Please try a different username.' };
    }

    const signUpResult = await signUp(client, payload);
    if (!signUpResult.ok) return signUpResult;

    const { data } = signUpResult;

    if (!data.session && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { ok: false, error: 'An account with this email already exists. Please sign in.' };
    }

    if (data.session) {
      let record = await fetchProfile(client, data.user.id);

      if (!record) {
        const insertPayload = buildPayload(data.user.id, data.user.email, { ...payload, ...data.user.user_metadata });
        const insertError = await insertProfile(client, insertPayload);
        if (insertError) {
          await client.auth.signOut();
          return { ok: false, error: 'Account profile could not be created. The database schema may be incomplete — if you are the administrator, please run the Setup Wizard from the banner above.' };
        }
        record = await fetchProfile(client, data.user.id);
      }

      if (!record) {
        await client.auth.signOut();
        return { ok: false, error: 'Account profile could not be created. The database schema may be incomplete — if you are the administrator, please run the Setup Wizard from the banner above.' };
      }

      if (!record.id || !record.email || !record.name || !record.status) {
        await client.auth.signOut();
        const missing = [];
        if (!record.id) missing.push('id');
        if (!record.email) missing.push('email');
        if (!record.name) missing.push('name');
        if (!record.status) missing.push('status');
        return { ok: false, error: `Profile missing required fields: ${missing.join(', ')}. Contact an administrator.` };
      }

      if (payload.is_first_account && record.full_access !== true) {
        await client.auth.signOut();
        return { ok: false, error: 'Administrator authority could not be verified for the first account.' };
      }

      await client.auth.signOut();
      return {
        ok: true,
        user: null,
        token: null,
        notice: 'Account created successfully. Please sign in with your credentials.',
        redirect: true,
      };
    }

    return {
      ok: true,
      user: null,
      token: null,
      notice: 'Account created. Check your email to confirm before signing in.',
    };
  } catch (err) {
    return { ok: false, error: describeError(err, 'Registration failed.') };
  }
}

export async function supabaseLogout() {
  const client = await getSupabaseClient();
  await client.auth.signOut();
}

export async function supabaseResendEmail(email) {
  try {
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.resend({
      type: 'signup',
      email: email,
      options: { emailRedirectTo: `${config.appUrl}/login` },
    });
    if (error) return { ok: false, error: describeError(error, 'Failed to resend confirmation email.') };
    return { ok: true, notice: 'Confirmation email resent. Please check your inbox.' };
  } catch (err) {
    return { ok: false, error: describeError(err, 'Failed to resend confirmation email.') };
  }
}

export async function checkAdminExists() {
  const client = await getSupabaseClient();
  try {
    const { data, error } = await client.rpc('check_admin_exists');
    if (!error) return { exists: data === true };
  } catch {}
  try {
    const { data, error } = await client.from('users').select('id', { count: 'exact', head: true }).eq('full_access', true).limit(1);
    if (!error) return { exists: (data?.length || 0) > 0 };
    return { exists: false, error: describeError(error, 'Could not check admin.') };
  } catch {
    return { exists: false };
  }
}

export async function restoreSession() {
  const client = await getSupabaseClient();

  if (AUTH_REDIRECT_TYPE) {
    await sleep(500);
    const { data: sessionData } = await client.auth.getSession();
    if (sessionData?.session) await client.auth.signOut();
    try { sessionStorage.setItem('email_confirmed', 'true'); } catch {}
    return null;
  }

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData?.session) return null;

  const userId = sessionData.session.user.id;
  const metadata = sessionData.session.user.user_metadata || {};

  const record = await fetchProfile(client, userId);
  if (!record) {
    await client.auth.signOut();
    return null;
  }

  return buildUser(record, metadata);
}

export async function checkDatabaseReady() {
  const client = await getSupabaseClient();
  try {
    const { error } = await client.from('users').select('id').limit(1);
    return { ready: !error, error: error?.message };
  } catch (err) {
    return { ready: false, error: err.message };
  }
}
