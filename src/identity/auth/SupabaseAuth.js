import { config } from '../../config/index.js';
import { getSupabaseClient } from './supabaseClient.js';
import { isMissingTableError } from '../../utils/dbErrors.js';

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

async function fetchProfileRecord(client, userId, { retries = 5, delayMs = 400 } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { data, error } = await client
      .from('users')
      .select('id, email, name, username, status, full_access, role_label, permissions')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) return { record: data, error: null };

    if (error) {
      lastError = error;
      if (isMissingTableError(error) || error.code === 'PGRST204') {
        return { record: null, error };
      }
    }

    if (attempt < retries) await sleep(delayMs);
  }
  return { record: null, error: lastError };
}

export async function supabaseLogin(identifier, password) {
  const trimmed = (identifier || '').trim();
  if (!trimmed) return { ok: false, error: 'Please enter your email, username, or phone number.' };

  try {
    const client = await getSupabaseClient();

    let email = '';
    const isEmail = EMAIL_PATTERN.test(trimmed);
    const isPhone = /^\d{10}$/.test(trimmed);

    if (isEmail) {
      email = trimmed;
    } else if (isPhone) {
      const { data: phoneData, error: phoneError } = await client
        .from('users')
        .select('email')
        .eq('phone', trimmed)
        .maybeSingle();
      if (phoneError || !phoneData) return { ok: false, error: 'No account found with that phone number.' };
      email = phoneData.email;
    } else {
      const { data: userData, error: userError } = await client
        .from('users')
        .select('email')
        .eq('username', trimmed.toLowerCase())
        .maybeSingle();
      if (userError || !userData) return { ok: false, error: 'No account found with that username.' };
      email = userData.email;
    }

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: describeError(error, 'Sign in failed.') };

    const { record, error: profileError } = await fetchProfileRecord(client, data.user.id);
    if (!record || profileError) {
      await client.auth.signOut();
      return { ok: false, error: 'Your account profile was not found. Contact an administrator.' };
    }

    return {
      ok: true,
      user: {
        id: data.user.id,
        name: data.user.user_metadata?.name || data.user.email,
        username: record.username || '',
        email: data.user.email,
        role_label: record.role_label || data.user.user_metadata?.role_label || '',
        full_access: record.full_access === true,
        permissions: record.permissions || data.user.user_metadata?.permissions || [],
      },
      token: data.session.access_token,
    };
  } catch (err) {
    return { ok: false, error: describeError(err, 'Sign in failed.') };
  }
}

export async function supabaseRegister(payload) {
  try {
    const client = await getSupabaseClient();

    if (payload.username) {
      const usernameLower = payload.username.trim().toLowerCase();
      const { data: existing } = await client
        .from('users')
        .select('username')
        .eq('username', usernameLower)
        .maybeSingle();
      if (existing) return { ok: false, error: 'Username already exists. Please try a different username.' };
      payload.username = usernameLower;
    }

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

    if (!data.session && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { ok: false, error: 'An account with this email already exists. Please sign in.' };
    }

    if (data.session) {
      const { record, error: profileError } = await fetchProfileRecord(client, data.user.id);

      if (!record || profileError) {
        await client.auth.signOut();
        return { ok: false, error: 'Account profile could not be created. Contact an administrator.' };
      }

      const missing = [];
      if (!record.id) missing.push('id');
      if (!record.email) missing.push('email');
      if (!record.name) missing.push('name');
      if (!record.status) missing.push('status');

      if (missing.length > 0) {
        await client.auth.signOut();
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
      options: {
        emailRedirectTo: `${config.appUrl}/login`,
      },
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
    const { data, error } = await client
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('full_access', true)
      .limit(1);
    if (error) return { exists: false, error: describeError(error, 'Could not check admin.') };
    return { exists: (data?.length || 0) > 0 };
  } catch {
    return { exists: false };
  }
}

export async function restoreSession() {
  const client = await getSupabaseClient();
  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData?.session) return null;

  const userId = sessionData.session.user.id;
  const metadata = sessionData.session.user.user_metadata || {};

  const { record, error: profileError } = await fetchProfileRecord(client, userId);
  if (!record || profileError) {
    await client.auth.signOut();
    return null;
  }

  return {
    id: userId,
    name: metadata.name || sessionData.session.user.email,
    username: record.username || '',
    email: sessionData.session.user.email,
    role_label: record.role_label || metadata.role_label || '',
    full_access: record.full_access === true,
    permissions: record.permissions || metadata.permissions || [],
  };
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
