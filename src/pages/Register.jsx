import { useState, useEffect } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useSettings } from '../auth/SettingsContext';
import { roleService } from '../services/roleService.js';
import { validatePassword } from '../utils/passwordPolicy.js';
import supabaseSync, { configure } from '../services/supabaseSync.js';
import { nowISO } from '../utils/id.js';
import Icon from '../components/Icon.jsx';
import Button from '../components/Button.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { Field, Input } from '../components/Field.jsx';

function slugCode(name) {
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function roleAccessSummary(role) {
  if (role.all) return 'Full access — all modules and settings';
  const perms = role.permissions || [];
  return perms.length ? `${perms.length} permission${perms.length === 1 ? '' : 's'}` : 'No access assigned';
}

export default function Register() {
  const { settings } = useSettings();
  const { login, isAuthenticated } = useAuth();
  const nav = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [adminRoleName, setAdminRoleName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');

  const [needsCreds, setNeedsCreds] = useState(!supabaseSync.isConfigured());
  const [credUrl, setCredUrl] = useState('');
  const [credServiceKey, setCredServiceKey] = useState('');
  const [credError, setCredError] = useState('');

  const [mode, setMode] = useState('checking');

  if (isAuthenticated) return <Navigate to="/" replace />;

  useEffect(() => {
    if (needsCreds) return;
    (async () => {
      try {
        const hasAdmin = supabaseSync.isConfigured()
          ? await supabaseSync.hasAdminUser()
          : false;

        if (!hasAdmin) {
          setMode('first-admin');
          return;
        }

        if (settings.allowRegistration === false) {
          setMode('blocked');
          return;
        }

        const res = await roleService.list();
        const list = Array.isArray(res) ? res : (res?.data || []);
        const publicRoles = list.filter((r) => !r.system && !r.all);
        setRoles(publicRoles);
        if (publicRoles.length) setSelectedRole(publicRoles[0].code);
        setMode(publicRoles.length ? 'normal' : 'blocked');
      } catch {
        setMode('blocked');
      }
    })();
  }, [needsCreds, settings.allowRegistration]);

  const submitCreds = (e) => {
    e.preventDefault();
    setCredError('');
    if (!credUrl.trim()) return setCredError('Supabase URL is required.');
    if (!credServiceKey.trim()) return setCredError('Service role key is required.');
    configure({ url: credUrl.trim(), serviceKey: credServiceKey.trim() });
    setNeedsCreds(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Full name is required.');
    if (!email.trim()) return setError('Email is required.');
    if (!phone.trim()) return setError('Phone number is required.');
    if (phone.length !== 10) return setError('Phone number must be exactly 10 digits.');
    if (!password) return setError('Password is required.');
    const pwResult = validatePassword(password);
    if (!pwResult.valid) return setError(pwResult.errors[0]);
    if (password !== confirm) return setError('Passwords do not match.');

    if (mode === 'first-admin') {
      const roleName = adminRoleName.trim();
      if (!roleName) return setError('Administrator role name is required.');

      setBusy(true);
      try {
        const roleCode = slugCode(roleName);
        const existingRoles = await supabaseSync.listRoles();
        const existing = (existingRoles || []).find(r => r.code === roleCode);
        const createdRole = existing || await roleService.create({
          code: roleCode,
          name: roleName,
          description: 'Full administrative access',
          permissions: [],
          all: true,
          inherits: [],
          system: true,
          status: 'Active',
          createdAt: nowISO(),
        });
        if (!createdRole) { setBusy(false); return setError('Failed to create administrator role.'); }

        const emailLower = email.trim().toLowerCase();
        const existingProfile = await supabaseSync.findUserByEmail(emailLower);
        if (existingProfile) {
          try { localStorage.setItem('corex_setup_complete', 'true'); } catch {}
          setBusy(false);
          nav('/login', { replace: true });
          return;
        }

        let authUser;
        try {
          authUser = await supabaseSync.createAuthUser(email.trim(), password, { name: name.trim() });
        } catch (err) {
          if (!err.message?.toLowerCase().includes('already registered')) {
            setBusy(false); return setError(err.message || 'Failed to create authentication account.');
          }
          authUser = await supabaseSync.signIn(email.trim(), password);
        }
        if (!authUser?.id && !authUser?.user?.id) { setBusy(false); return setError('Failed to create authentication account.'); }
        const authId = authUser.id || authUser.user?.id;

        const record = await supabaseSync.createUser({
          id: authId,
          name: name.trim(),
          email: emailLower,
          roleCode: createdRole.code || roleCode,
          permissions: ['SYSTEM_ADMIN'],
          status: 'Active',
          createdAt: nowISO(),
        });
        if (!record) { setBusy(false); return setError('Failed to create user profile.'); }

        try { localStorage.setItem('corex_setup_complete', 'true'); } catch {}
        setBusy(false);
        nav('/login', { replace: true });
      } catch (err) {
        setBusy(false);
        setError(err.message || 'Registration failed.');
      }
      return;
    }

    if (!selectedRole) return setError('Please select a role.');
    setBusy(true);
    try {
      const result = await supabaseSync.signUp(email.trim(), password, { name: name.trim() });

      if (result?.user?.identities?.length === 0) {
        setNotice('Account already registered. Please sign in.');
        setBusy(false);
        setTimeout(() => nav('/login', { replace: true }), 2500);
        return;
      }

      if (result?.user?.id) {
        await supabaseSync.createUser({
          id: result.user.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          roleCode: selectedRole,
          status: 'Active',
          createdAt: nowISO(),
        });
      }

      setBusy(false);
      const loginRes = await login(email.trim(), password);
      nav(loginRes.ok ? '/' : '/login', { replace: true });
    } catch (err) {
      setBusy(false);
      setError(err.message || 'Registration failed.');
    }
  };

  const logo = (
    <div className="auth-card__logo">
      {settings.logoUrl
        ? <img src={settings.logoUrl} alt={settings.siteTitle} className="auth-card__logo-img" />
        : <div className="auth-card__logo-fallback">{settings.siteTitle?.charAt(0) || 'R'}</div>}
    </div>
  );

  if (needsCreds) {
    return (
      <div className="fade-in">
        {logo}
        <h1 className="auth-title">Connect to Database</h1>
        <p className="auth-sub">Enter your Supabase credentials to continue setup.</p>
        {credError && <div className="alert alert-danger alert--mb"><Icon name="alert" size={16} />{credError}</div>}
        <form onSubmit={submitCreds}>
          <Field label="Supabase URL">
            <Input value={credUrl} onChange={(e) => setCredUrl(e.target.value)} placeholder="https://your-project.supabase.co" autoFocus required />
          </Field>
          <Field label="Service Role Key">
            <Input value={credServiceKey} onChange={(e) => setCredServiceKey(e.target.value)} placeholder="eyJ..." required />
          </Field>
          <Button type="submit" variant="primary" className="btn-full" icon="shield">Connect</Button>
        </form>
      </div>
    );
  }

  if (mode === 'checking') {
    return <div className="spinner-center min-h-screen"><div className="spinner spinner-lg" /></div>;
  }

  if (mode === 'blocked') {
    return (
      <div className="fade-in">
        {logo}
        <h1 className="auth-title">Registration Disabled</h1>
        <p className="auth-sub">Public registration is currently disabled. Contact an administrator for access.</p>
        <div className="auth-foot"><Link to="/login" className="auth-link">&larr; Back to sign in</Link></div>
      </div>
    );
  }

  const isFirstAdmin = mode === 'first-admin';

  return (
    <div className="fade-in">
      {logo}
      <h1 className="auth-title">{isFirstAdmin ? 'Create First Administrator' : 'Create Account'}</h1>
      <p className="auth-sub">
        {isFirstAdmin
          ? 'No administrator account exists. Set up the first administrator account.'
          : 'Register a new account to get started.'}
      </p>

      {error && <div className="alert alert-danger alert--mb"><Icon name="alert" size={16} />{error}</div>}
      {notice && <div className="alert alert-success alert--mb"><Icon name="check" size={16} />{notice}</div>}

      <form onSubmit={submit}>
        <Field label="Full Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" autoFocus required />
        </Field>
        <Field label="Email Address">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" required />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Enter 10-digit mobile number" required />
        </Field>
        <Field label="Password">
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
        </Field>
        <Field label="Confirm Password">
          <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" required />
        </Field>

        {isFirstAdmin && (
          <Field label="Administrator Role Name" hint="e.g. Administrator, Super Admin">
            <Input
              value={adminRoleName}
              onChange={(e) => setAdminRoleName(e.target.value)}
              placeholder="Enter a name for the admin role"
              required
            />
          </Field>
        )}

        {mode === 'normal' && roles.length > 0 && (
          <Field label="Select Role">
            <div className="auth-role-list">
              {roles.map((r) => {
                const code = r.code || r.name;
                const active = selectedRole === code;
                return (
                  <button type="button" key={code} className={`auth-role ${active ? 'auth-role--active' : ''}`} onClick={() => setSelectedRole(code)}>
                    <span className="auth-role__check">{active && <Icon name="check" size={12} />}</span>
                    <span className="auth-role__body">
                      <span className="auth-role__name">{r.name || code}</span>
                      <span className="auth-role__access">{roleAccessSummary(r)}</span>
                      {r.description && <span className="auth-role__desc">{r.description}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        <Button type="submit" variant="primary" className="btn-full" loading={busy} icon="shield">
          {isFirstAdmin ? 'Create Administrator' : 'Create Account'}
        </Button>
      </form>

      {!isFirstAdmin && (
        <div className="auth-foot">
          <span className="auth-note">Already have an account? </span>
          <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      )}
    </div>
  );
}