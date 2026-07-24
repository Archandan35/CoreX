import { createContext, useState, useContext, useCallback, useEffect } from 'react';
import supabaseSync from '../services/supabaseSync.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const session = supabaseSync.getSession();
        if (!session?.access_token) {
          setLoading(false);
          return;
        }
        const authUser = await supabaseSync.getCurrentUser();
        if (!authUser?.email) {
          setLoading(false);
          return;
        }
        const profile = await supabaseSync.findUserByEmail(authUser.email);
        setUser(profile || {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
          username: authUser.email?.split('@')[0] || '',
          roleCode: '',
          status: 'Active',
          createdAt: new Date().toISOString(),
        });
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      setLoading(true);
      const session = await supabaseSync.signIn(email, password);
      if (!session?.user) {
        setLoading(false);
        return { ok: false, error: 'Invalid email or password' };
      }

      const profile = await supabaseSync.findUserByEmail(email);
      const appUser = profile || {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
        username: session.user.email?.split('@')[0] || '',
        roleCode: '',
        status: 'Active',
        createdAt: new Date().toISOString(),
      };

      setUser(appUser);
      setLoading(false);
      return { ok: true, user: appUser };
    } catch (err) {
      setLoading(false);
      return { ok: false, error: err.message || 'Authentication failed' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabaseSync.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login: signIn, signIn, signOut, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;