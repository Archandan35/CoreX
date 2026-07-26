import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon.jsx';
import Button from '../components/ui/Button.jsx';
import PasswordInput from '../components/ui/PasswordInput.jsx';
import { Field, Input } from '../components/ui/Field.jsx';
import { useAuth } from '../identity/auth/AuthContext.jsx';
import PasswordStrength from '../components/ui/PasswordStrength.jsx';

export default function Register({ isFirstAccount }) {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleLabel, setRoleLabel] = useState(isFirstAccount ? 'System Administrator' : '');
  const [fullAccess, setFullAccess] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

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
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role_label: roleLabel.trim(),
        full_access: fullAccess,
        password,
        is_first_account: isFirstAccount === true,
      });
      if (result.ok && result.user) {
        navigate('/', { replace: true });
        return;
      }
      if (result?.notice) setNotice(result.notice);
      if (result?.error) setError(result.error);
    } catch {
      setError('Registration failed.');
    } finally {
      setBusy(false);
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
          <Field label="Email Address" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" required />
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
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
          </Field>
          {password && <PasswordStrength password={password} />}

          <Field label="Confirm Password" required>
            <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" required />
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
          <div className="auth-foot">
            <span className="auth-note">Already confirmed? </span>
            <a href="#login" className="auth-link" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Sign in</a>
          </div>
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
