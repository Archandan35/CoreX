import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setApiToken } from '../../services/api.js';
import { config } from '../../config/index.js';

const AuthContext = createContext(null);

let supabaseAuth = null;
async function getSupabaseAuth() {
  if (supabaseAuth) return supabaseAuth;
  supabaseAuth = await import('./SupabaseAuth.js');
  return supabaseAuth;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const auth = await getSupabaseAuth();
      const sessionUser = await auth.restoreSession();
      if (!cancelled && sessionUser) {
        setUser(sessionUser);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const isAuthenticated = !!user;

  const hasFullAccess = user?.full_access === true;

  const hasPermission = useCallback((permission) => {
    if (!permission) return true;
    if (hasFullAccess) return true;
    const perms = user?.permissions || [];
    return perms.includes(permission);
  }, [user, hasFullAccess]);

  const login = useCallback(async (identifier, password) => {
    const auth = await getSupabaseAuth();
    const result = await auth.supabaseLogin(identifier, password);
    if (result.ok) {
      setUser(result.user);
      setApiToken(result.token);
    }
    return { ok: result.ok, error: result.error };
  }, []);

  const register = useCallback(async (payload) => {
    const auth = await getSupabaseAuth();
    const result = await auth.supabaseRegister(payload);
    if (result.ok) {
      setUser(result.user);
      setApiToken(result.token);
    }
    return { ok: result.ok, error: result.error, notice: result.notice, user: result.user, token: result.token };
  }, []);

  const logout = useCallback(async () => {
    const auth = await getSupabaseAuth();
    await auth.supabaseLogout();
    setUser(null);
    setApiToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, hasFullAccess, hasPermission, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}