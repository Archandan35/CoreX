import supabaseSync from '../services/supabaseSync';

class AuthService {
  constructor() {
    this._user = null;
    this._initialized = false;
  }

  async init() {
    try {
      const session = supabaseSync.getSession();
      if (session?.access_token) {
        const authUser = await supabaseSync.getCurrentUser();
        if (authUser) {
          const profile = await supabaseSync.findUserByEmail(authUser.email);
          this._user = profile || {
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
            roleCode: '',
            status: 'Active',
          };
        }
      }
    } catch {}
    this._initialized = true;
    return this._user;
  }

  async signIn(credentials) {
    const session = await supabaseSync.signIn(credentials.email, credentials.password);
    const profile = await supabaseSync.findUserByEmail(credentials.email);
    this._user = profile || {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
      roleCode: '',
      status: 'Active',
    };
    return session;
  }

  async signOut() {
    await supabaseSync.signOut();
    this._user = null;
  }

  async getCurrentUser() {
    if (!this._user) {
      const session = supabaseSync.getSession();
      if (session?.access_token) {
        const authUser = await supabaseSync.getCurrentUser();
        if (authUser) {
          const profile = await supabaseSync.findUserByEmail(authUser.email);
          this._user = profile || { id: authUser.id, email: authUser.email, name: '', roleCode: '', status: 'Active' };
        }
      }
    }
    return this._user;
  }

  isAuthenticated() {
    return !!this._user;
  }

  getUserPermissions() {
    return this._user?.permissions || [];
  }

  getUserCapabilities() {
    return this._user?.capabilities || [];
  }

  getUserRole() {
    return this._user?.role || '';
  }

  async isFirstInstall() {
    return !(await supabaseSync.hasAnyUser());
  }

  isInitialized() {
    return this._initialized;
  }
}

const authService = new AuthService();
export default authService;