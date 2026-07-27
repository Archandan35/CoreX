import { config } from '../../config/index.js';
import { getSupabaseClient } from './supabaseClient.js';
import { isMissingTableError } from '../../utils/dbErrors.js';

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

function esc(v) {
  return (v || '').replace(/'/g, "''");
}

async function sqlQuery(client, queryText) {
  try {
    const { data, error } = await client.rpc('exec_sql', { query_text: queryText });
    if (!error && data) return data;
  } catch {}
  return null;
}

function userFromRecord(record, metadata) {
  return {
    id: record.id,
    name: record.name || metadata?.name || record.email?.split('@')[0] || '',
    username: record.username || metadata?.username || '',
    email: record.email || '',
    role_label: record.role_label || metadata?.role_label || '',
    full_access: record.full_access === true,
    permissions: record.permissions || metadata?.permissions || [],
  };
}

async function fetchProfileRecord(client, userId) {
  const core = ['id', 'email', 'name', 'status', 'full_access', 'role_label', 'permissions'];

  const { data, error } = await client
    .from('users')
    .select(core.join(', '))
    .eq('id', userId)
    .maybeSingle();

  if (!error && data) return { record: data, error: null };

  const rows = await sqlQuery(
    client,
    `SELECT ${core.join(', ')} FROM public.users WHERE id = '${userId}'`
  );
  if (rows && rows.length > 0) return { record: rows[0], error: null };

  return { record: null, error };
}

function permissionsSql(arr) {
  if (!arr || arr.length === 0) return 'ARRAY[]::text[]';
  return `ARRAY[${arr.map((v) => `'${esc(String(v))}'`).join(', ')}]::text[]`;
}

async function insertProfileRow(client, payload) {
  const { error } = await client.from('users').insert(payload);
  if (!error) return null;

  const result = await sqlQuery(
    client,
    `INSERT INTO public.users (id, email, name, phone, role_label, full_access, permissions, status) VALUES ('${payload.id}', '${esc(payload.email)}', '${esc(payload.name)}', '${esc(payload.phone)}', '${esc(payload.role_label)}', ${payload.full_access}, ${permissionsSql(payload.permissions)}, 'active')`
  );

  return result ? null : { message: 'insert failed' };
}

function buildPayload(id, email, meta) {
  return {
    id,
    email,
    name: meta?.name || email.split('@')[0],
    phone: meta?.phone || '',
    role_label: meta?.role_label || '',
    full_access: meta?.full_access === true,
    permissions: meta?.permissions || [],
    status: 'active',
  };
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

    let { record } = await fetchProfileRecord(client, data.user.id);

    if (!record) {
      const payload = buildPayload(data.user.id, data.user.email, data.user.user_metadata);
      const insertError = await insertProfileRow(client, payload);
      if (!insertError) {
        const retry = await fetchProfileRecord(client, data.user.id);
        record = retry.record;
      }
    }

    if (!record) {
      await client.auth.signOut();
      return { ok: false, error: 'Your account profile was not found. The database schema may be incomplete — if you are the administrator, please run the Setup Wizard from the banner above.' };
    }

    return {
      ok: true,
      user: userFromRecord(record, data.user.user_metadata),
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
      let { record } = await fetchProfileRecord(client, data.user.id);

      if (!record) {
        const insertPayload = buildPayload(
          data.user.id,
          data.user.email,
          { ...payload, ...data.user.user_metadata }
        );

        const insertError = await insertProfileRow(client, insertPayload);
        if (insertError) {
          await client.auth.signOut();
          return { ok: false, error: 'Account profile could not be created. The database schema may be incomplete — if you are the administrator, please run the Setup Wizard from the banner above.' };
        }
        const retry = await fetchProfileRecord(client, data.user.id);
        record = retry.record;
      }

      if (!record) {
        await client.auth.signOut();
        return { ok: false, error: 'Account profile could not be created. The database schema may be incomplete — if you are the administrator, please run the Setup Wizard from the banner above.' };
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
    if (!error) return { exists: (data?.length || 0) > 0 };
    const rows = await sqlQuery(client, 'SELECT COUNT(*) as count FROM public.users WHERE full_access = true');
    if (rows && rows.length > 0) {
      return { exists: parseInt(rows[0]?.count || 0, 10) > 0 };
    }
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
    if (sessionData?.session) {
      await client.auth.signOut();
    }
    try { sessionStorage.setItem('email_confirmed', 'true'); } catch {}
    return null;
  }

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData?.session) return null;

  const userId = sessionData.session.user.id;
  const metadata = sessionData.session.user.user_metadata || {};

  const { record } = await fetchProfileRecord(client, userId);
  if (!record) {
    await client.auth.signOut();
    return null;
  }

  return userFromRecord(record, metadata);
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
