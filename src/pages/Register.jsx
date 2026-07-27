import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon.jsx';
import Button from '../components/ui/Button.jsx';
import PasswordInput from '../components/ui/PasswordInput.jsx';
import { Field, Input } from '../components/ui/Field.jsx';
import { useAuth } from '../identity/auth/AuthContext.jsx';
import { useApp } from '../state/AppContext.jsx';
import PasswordStrength from '../components/ui/PasswordStrength.jsx';

export default function Register({ isFirstAccount }) {
  const navigate = useNavigate();
  const { register, resendEmail, isAuthenticated } = useAuth();
  // After this page creates the first administrator, re-run the admin
  // detection so the "no administrator" banner disappears automatically
  // across the whole app (per spec) instead of persisting on stale state.
  const { refreshAdminStatus } = useApp();
  const [isDark, setIsDark] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleLabel, setRoleLabel] = useState(isFirstAccount ? 'System Administrator' : '');
  const [fullAccess, setFullAccess] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  if (isAuthenticated) return null;

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  };

  const handlePhoneChange = (e) => {
    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!name.trim()) return setError('Full name is required.');
    if (!username.trim()) return setError('Username is required.');
    if (!/^[a-zA-Z0-9]+$/.test(username.trim())) return setError('Username can only contain letters and numbers.');
    if (!email.trim()) return setError('Email is required.');
    if (!phone.trim()) return setError('Phone number is required.');
    if (phone.length !== 10) return setError('Phone number must be exactly 10 digits.');
    if (!password) return setError('Password is required.');
    if (password !== confirm) return setError('Passwords do not match.');
    if (!fullAccess) return setError('Full Access must be enabled to create an account.');

    setBusy(true);
    try {
      const result = await register({
        name: name.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role_label: roleLabel.trim(),
        full_access: fullAccess,
        password,
        is_first_account: isFirstAccount === true,
      });
      // Per the spec, registration always redirects to Login — never
      // auto-navigates to dashboard, even when email confirmation is disabled.
      // The first admin has still been created in the database, so refresh
      // admin status so the "no administrator" banner is gone by the time the
      // user signs in.
      if (result.ok && isFirstAccount && typeof refreshAdminStatus === 'function') {
        Promise.resolve(refreshAdminStatus()).catch(() => {});
      }
      if (result?.notice) {
        setNotice(result.notice);
      } else if (result?.error) {
        setError(result.error);
      } else if (result.ok) {
        setNotice('Account created successfully. Please sign in with your credentials.');
      }
    } catch {
      setError('Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      const result = await resendEmail(email);
      if (result.notice) setNotice(result.notice);
      if (result.error) setError(result.error);
    } catch {
      setError('Failed to resend confirmation email.');
    } finally {
      setResending(false);
    }
  };

  const canSubmit = fullAccess;

  return (
    <div className="auth-layout" data-theme={isDark ? 'dark' : 'light'}>
      <div className="auth-card fade-in">
        <button className="auth-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
          <Icon name={isDark ? 'sun' : 'moon'} size={18} />
        </button>
        <div className="auth-card__logo">
          <div className="auth-card__logo-fallback">C</div>
        </div>

        <h1 className="auth-title">{notice ? 'Check Your Email' : 'Create Account'}</h1>
        <p className="auth-sub">
          {notice
            ? 'We sent a confirmation link to your email address. Please check your inbox and click the link to verify your account.'
            : 'Register a new administrator account to get started.'}
        </p>

        {error && <div className="alert alert-danger alert--mb"><Icon name="alert" size={16} />{error}</div>}
        {notice && <div className="alert alert-success alert--mb" style={{ marginBottom: 16 }}><Icon name="check" size={16} />{notice}</div>}

        {!notice ? (

        <form onSubmit={submit}>
          <Field label="Full Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" autoFocus required />
          </Field>
          <Field label="Username" required>
            <Input value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))} placeholder="Enter username (letters &amp; numbers only)" required />
          </Field>
          <Field label="Email Address" required>
            <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" required />
          </Field>
          <Field label="Phone" required>
            <Input value={phone} onChange={handlePhoneChange} placeholder="Enter 10-digit mobile number" required />
          </Field>

          <Field label="Authority Level">
            <Input value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} placeholder="e.g. System Administrator" />
          </Field>

          <div className="form-group">
            <label className="form-label">Permission</label>
            <div className="full-access-toggle">
              <div className="full-access-row">
                <span className="full-access-label">Full Access</span>
                <div className="toggle-with-label">
                  <span className={`toggle-status ${!fullAccess ? 'toggle-status--active' : ''}`}>Disable</span>
                  <button
                    type="button"
                    className={`toggle-switch ${fullAccess ? 'toggle-switch--on' : ''}`}
                    onClick={() => setFullAccess(!fullAccess)}
                    role="switch"
                    aria-checked={fullAccess}
                    aria-label="Full Access"
                  >
                    <span className="toggle-switch-knob" />
                  </button>
                  <span className={`toggle-status ${fullAccess ? 'toggle-status--active' : ''}`}>Enable</span>
                </div>
              </div>
              {!fullAccess && (
                <div className="alert alert-danger alert--mb" style={{ marginTop: 8 }}>
                  <Icon name="alert" size={16} />
                  Full Access must be enabled to create an account. Administrative authority is required.
                </div>
              )}
              <p className="full-access-hint">
                Enable unrestricted system access.
              </p>
            </div>
          </div>

          <Field label="Password" required>
            <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
          </Field>
          {password && <PasswordStrength password={password} />}

          <Field label="Confirm Password" required>
            <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" required />
          </Field>

          <Button
            type="submit"
            variant="primary"
            className="btn-full"
            loading={busy}
            disabled={!canSubmit}
            icon="shield"
          >
            Create Account
          </Button>
        </form>

        ) : (
          <>
            <div className="auth-foot">
              <span className="auth-note">Already confirmed? </span>
              <a href="#login" className="auth-link" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Sign in</a>
            </div>
            <div className="auth-foot" style={{ marginTop: 8 }}>
              <span className="auth-note">Didn't receive the email? </span>
              <button
                type="button"
                className="auth-link"
                onClick={handleResend}
                disabled={resending}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
              >
                {resending ? 'Sending...' : 'Resend confirmation email'}
              </button>
            </div>
          </>
        )}

        {!isFirstAccount && (
          <div className="auth-foot">
            <span className="auth-note">Already have an account? </span>
            <a href="#login" className="auth-link" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Sign in</a>
          </div>
        )}
      </div>
    </div>
  );
}
