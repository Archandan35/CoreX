function normalizeUrl(u) {
  try {
    const parsed = new URL(u);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return u.replace(/\/+$/, '');
  }
}

async function fetchStatus(url, options) {
  const res = await fetch(url, options);
  return { status: res.status };
}

export default class ConnectionManager {
  async testConnection(config) {
    const { url, anonKey, serviceKey } = config;

    if (config.driver !== 'supabase') {
      return { ok: false, message: 'Only Supabase driver is supported.' };
    }

    if (!url) return { ok: false, message: 'Invalid Supabase URL.' };
    if (!anonKey) return { ok: false, message: 'Invalid API key: Anon key' };
    if (!serviceKey) return { ok: false, message: 'Invalid API key: Service role key' };

    const base = normalizeUrl(url);

    try {
      await fetch(`${base}/auth/v1/settings`, { method: 'HEAD' });
    } catch {
      return { ok: false, message: 'Unable to connect to the Supabase project. Please check your URL, API key, and network connection.' };
    }

    try {
      const { status } = await fetchStatus(`${base}/rest/v1/rpc/__setup_verify`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      });
      if (status === 401) return { ok: false, message: 'Invalid API key: Anon key' };
      if (status !== 404) return { ok: false, message: 'The API key does not belong to this Supabase project.' };
    } catch {
      return { ok: false, message: 'Unable to connect to the Supabase project. Please check your URL, API key, and network connection.' };
    }

    try {
      const { status } = await fetchStatus(`${base}/auth/v1/admin/users?per_page=1`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      if (status === 401) return { ok: false, message: 'Invalid API key: Service role key' };
      if (status !== 200) return { ok: false, message: 'The API key does not belong to this Supabase project.' };
    } catch {
      return { ok: false, message: 'Unable to connect to the Supabase project. Please check your URL, API key, and network connection.' };
    }

    return { ok: true, message: 'Connected to Supabase — all keys verified', version: '1.0' };
  }
}
