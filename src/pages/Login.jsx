import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useSettings } from '../auth/SettingsContext';
import { useTheme } from '../hooks/useTheme';
import supabaseSync from '../services/supabaseSync.js';
import Icon from '../components/Icon.jsx';
import Button from '../components/Button.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { Field, Input } from '../components/Field.jsx';

export default function Login() {
  const { theme, toggleTheme, isDark } = useTheme();
  const { login, isAuthenticated, loading } = useAuth();
  const { settings } = useSettings();
  const nav = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [bootstrapChecked, setBootstrapChecked] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);

  const from = location.state?.from || '/';

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!supabaseSync.isConfigured()) { if (active) { setNeedsBootstrap(false); setBootstrapChecked(true); } return; }
        const schemaOk = await supabaseSync.checkSchemaExists();
        if (!schemaOk) { if (active) { setNeedsBootstrap(false); setBootstrapChecked(true); } return; }
        const hasAdmin = await supabaseSync.hasAdminUser();
        if (active) { setNeedsBootstrap(!hasAdmin); setBootstrapChecked(true); }
      } catch {
        if (active) { setNeedsBootstrap(false); setBootstrapChecked(true); }
      }
    })();
    return () => { active = false; };
  }, []);

  if (isAuthenticated) return <Navigate to={from} replace />;

  if (bootstrapChecked && needsBootstrap) return <Navigate to="/register" replace />

  if (loading || !bootstrapChecked) {
    return (
      <div className="spinner-center min-h-screen">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);

    const res = await login(identifier.trim(), password);
    setBusy(false);
    if (res.ok) nav(from, { replace: true });
    else setError(res.error || 'Sign in failed.');
  };

  return (
    <>
      <div className="fade-in">
        <button className="auth-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
          <Icon name={isDark ? 'sun' : 'moon'} size={18} />
        </button>
        <div className="auth-card__logo">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.siteTitle} className="auth-card__logo-img" />
          ) : (
            <div className="auth-card__logo-fallback">{settings.siteTitle?.charAt(0) || 'L'}</div>
          )}
        </div>

        <h1 className="auth-title">Sign in</h1>
        <p className="auth-sub">Sign in to your account to continue</p>

        {error && <div className="alert alert-danger alert--mb"><Icon name="alert" size={16} />{error}</div>}

        <form onSubmit={submit}>
          <Field label="Email">
            <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="e.g. admin@company.com" autoFocus />
          </Field>
          <Field label="Password">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
          </Field>
          <Button type="submit" variant="primary" className="btn-full" loading={busy} icon="shield">Sign in</Button>
        </form>

        <div className="auth-foot auth-foot--between">
          <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
          {settings.allowRegistration ? <Link to="/register" className="auth-link">Create account</Link> : null}
        </div>

      </div>
    </>
  );
}