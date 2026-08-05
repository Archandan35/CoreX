import { config } from '../../config/index.js';

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

let initialized = false;
let timerId = null;

async function ping() {
  try {
    const url = `${config.supabaseUrl}/rest/v1/settings?select=updated_at&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });
    if (!res.ok) {
      console.warn(`[KeepAlive] Database ping failed: ${res.status}`);
    }
  } catch (err) {
    console.warn('[KeepAlive] Database ping failed:', err.message);
  }
}

export const keepAliveService = {
  start() {
    if (initialized) return;
    if (!config.supabaseUrl || !config.supabaseAnonKey) return;
    initialized = true;
    ping();
    timerId = setInterval(ping, FIVE_DAYS_MS);
  },

  stop() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    initialized = false;
  },
};
