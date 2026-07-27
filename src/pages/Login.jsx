import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon.jsx';
import Button from '../components/ui/Button.jsx';
import PasswordInput from '../components/ui/PasswordInput.jsx';
import { Field, Input } from '../components/ui/Field.jsx';
import { useAuth } from '../identity/auth/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    try {
      const ec = sessionStorage.getItem('email_confirmed');
      if (ec === 'true') {
        sessionStorage.removeItem('email_confirmed');
        setConfirmed(true);
      }
      const rc = sessionStorage.getItem('registration_complete');
      if (rc === 'true') {
        sessionStorage.removeItem('registration_complete');
        setRegistered(true);
      }
    } catch {}
  }, []);

  if (isAuthenticated) return null;

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await login(identifier.trim(), password);
      if (res.ok) navigate('/', { replace: true });
      else setError(res.error || 'Sign in failed.');
    } catch {
      setError('Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-layout" data-theme={isDark ? 'dark' : 'light'}>
      <div className="auth-card fade-in">
        <button className="auth-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
          <Icon name={isDark ? 'sun' : 'moon'} size={18} />
        </button>
        <div className="auth-card__logo">
          <div className="auth-card__logo-fallback">C</div>
        </div>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-sub">Sign in with your email to continue</p>

        {confirmed && <div className="alert alert-success alert--mb"><Icon name="check" size={16} />Email confirmed! Your account is ready. Please sign in with your credentials.</div>}
        {registered && <div className="alert alert-success alert--mb"><Icon name="check" size={16} />Account created successfully! Please sign in with your credentials.</div>}
        {error && <div className="alert alert-danger alert--mb"><Icon name="alert" size={16} />{error}</div>}

        <form onSubmit={submit}>
          <Field label="Email / Username / Phone">
            <Input type="text" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="e.g. admin@company.com or username or 9876543210" autoFocus />
          </Field>
          <Field label="Password">
            <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
          </Field>
          <Button type="submit" variant="primary" className="btn-full" loading={busy} icon="shield">Sign in</Button>
        </form>
      </div>
    </div>
  );
}
