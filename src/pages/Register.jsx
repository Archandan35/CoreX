import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon.jsx';
import Button from '../components/ui/Button.jsx';
import PasswordInput from '../components/ui/PasswordInput.jsx';
import { Field, Input } from '../components/ui/Field.jsx';
import { useAuth } from '../identity/auth/AuthContext.jsx';
import { useApp } from '../state/AppContext.jsx';
import PasswordStrength from '../components/ui/PasswordStrength.jsx';
import { notificationManager } from '../managers/NotificationManager.js';

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
    setNotice('');

    if (!name.trim()) { notificationManager.error('Full name is required.'); return; }
    if (!username.trim()) { notificationManager.error('Username is required.'); return; }
    if (!/^[a-zA-Z0-9]+$/.test(username.trim())) { notificationManager.error('Username can only contain letters and numbers.'); return; }
    if (!email.trim()) { notificationManager.error('Email is required.'); return; }
    if (!phone.trim()) { notificationManager.error('Phone number is required.'); return; }
    if (phone.length !== 10) { notificationManager.error('Phone number must be exactly 10 digits.'); return; }
    if (!password) { notificationManager.error('Password is required.'); return; }
    if (password !== confirm) { notificationManager.error('Passwords do not match.'); return; }
    if (!fullAccess) { notificationManager.error('Full Access must be enabled to create an account.'); return; }

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
      if (result.ok) {
        if (result.redirect) {
          // email confirmation disabled — profile was created immediately.
          // Wait for admin status refresh so the route guard at /login
          // doesn't bounce the user back to /register, then redirect.
          if (isFirstAccount && typeof refreshAdminStatus === 'function') {
            try { await refreshAdminStatus(); } catch {}
          }
          try { sessionStorage.setItem('registration_complete', 'true'); } catch {}
          navigate('/login', { replace: true });
          return;
        }
        setNotice(result.notice || 'Account created. Please check your email to confirm before signing in.');
      } else {
        notificationManager.error(result.error || 'Registration failed.');
      }
    } catch {
      notificationManager.error('Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const result = await resendEmail(email);
      if (result.notice) notificationManager.success(result.notice);
      if (result.error) notificationManager.error(result.error);
    } catch {
      notificationManager.error('Failed to resend confirmation email.');
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

        {notice && <div className="alert alert-success alert--mb"><Icon name="check" size={16} />{notice}</div>}

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
                <div className="alert alert-danger alert--mb alert--danger-mt">
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
            <div className="auth-foot auth-foot--compact">
              <span className="auth-note">Didn't receive the email? </span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="auth-link auth-link--btn"
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
