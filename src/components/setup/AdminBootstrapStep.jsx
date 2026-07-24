import { useState, useEffect } from 'react';
import Button from '../Button.jsx';
import PasswordInput from '../PasswordInput.jsx';
import { Field, Input } from '../Field.jsx';
import Icon from '../Icon.jsx';
import { roleService } from '../../services/roleService.js';
import { validatePassword } from '../../utils/passwordPolicy.js';
import supabaseSync, { configure } from '../../services/supabaseSync.js';
import { nowISO } from '../../utils/id.js';

function slugCode(name) {
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export default function AdminBootstrapStep({ config, setCanProceed, next, back }) {
  const [adminExists, setAdminExists] = useState(null);
  const [checking, setChecking] = useState(true);

  const [adminRoleName, setAdminRoleName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    configure({ url: config?.url, anonKey: config?.anonKey, serviceKey: config?.serviceKey });
    let active = true;
    (async () => {
      try {
        const exists = await supabaseSync.hasAdminUser();
        if (active) { setAdminExists(exists); setChecking(false); setCanProceed(exists); }
      } catch {
        if (active) { setAdminExists(false); setChecking(false); setCanProceed(false); }
      }
    })();
    return () => { active = false; };
  }, [config, setCanProceed]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const roleName = adminRoleName.trim();
    if (!roleName) return setError('Administrator role name is required.');
    if (!name.trim()) return setError('Full name is required.');
    if (!email.trim()) return setError('Email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please provide a valid email address.');
    if (!username.trim()) return setError('Username is required.');
    if (!phone.trim()) return setError('Phone number is required.');
    if (phone.replace(/\D/g, '').length !== 10) return setError('Phone number must be exactly 10 digits.');
    if (!password) return setError('Password is required.');
    const pwResult = validatePassword(password, { username, email });
    if (!pwResult.valid) return setError(pwResult.errors[0]);
    if (password !== confirm) return setError('Passwords do not match.');

    setBusy(true);
    configure({ url: config?.url, anonKey: config?.anonKey, serviceKey: config?.serviceKey });

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
        setBusy(false);
        try { localStorage.setItem('corex_setup_complete', 'true'); } catch {}
        setCreated(true);
        setCanProceed(true);
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
        status: 'Active',
        createdAt: nowISO(),
      });
      if (!record) { setBusy(false); return setError('Failed to create user profile.'); }

      setBusy(false);
      try { localStorage.setItem('corex_setup_complete', 'true'); } catch {}
      setCreated(true);
      setCanProceed(true);
    } catch (err) {
      setBusy(false);
      setError(err.message || 'Failed to create administrator account.');
    }
  };

  if (checking) {
    return (
      <div className="setup-step-content">
        <h2 className="setup-step-title">Administrator Setup</h2>
        <div className="setup-scanning">
          <div className="spinner spinner-lg" />
          <p>Checking for existing administrator...</p>
        </div>
      </div>
    );
  }

  if (adminExists && !created) {
    return (
      <div className="setup-step-content">
        <h2 className="setup-step-title">Administrator Setup</h2>
        <div className="setup-plan__group" style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✓</div>
          <h4 style={{ margin: '0 0 4px', color: 'var(--success)' }}>Administrator Found</h4>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>An administrator account is already configured.</p>
        </div>
        <div className="setup-nav">
          <Button variant="ghost" onClick={back}>Back</Button>
          <Button variant="primary" onClick={next}>Continue</Button>
        </div>
      </div>
    );
  }

  if (created) {
    return (
      <div className="setup-step-content">
        <h2 className="setup-step-title">Administrator Setup</h2>
        <div className="setup-plan__group" style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✓</div>
          <h4 style={{ margin: '0 0 4px', color: 'var(--success)' }}>Administrator Created</h4>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>The administrator account has been created successfully.</p>
        </div>
        <div className="setup-nav">
          <Button variant="primary" onClick={next}>Continue</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-step-content">
      <h2 className="setup-step-title">Create First Administrator</h2>
      <p className="setup-step-desc">
        Create the administrator role and the first account with full access.
      </p>

      {error && (
        <div className="alert alert-danger alert--mb">
          <Icon name="alert" size={16} />{error}
        </div>
      )}

      <form onSubmit={submit}>
        <div className="setup-bootstrap-section">
          <h4 className="setup-plan__group-title">Administrator Role</h4>
          <Field label="Role Name" hint="e.g. Administrator, Super Admin">
            <Input
              value={adminRoleName}
              onChange={(e) => setAdminRoleName(e.target.value)}
              placeholder="Enter a name for the admin role"
              autoFocus
              required
            />
          </Field>
        </div>

        <div className="setup-bootstrap-section">
          <h4 className="setup-plan__group-title">Account Information</h4>
          <Field label="Full Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter full name" required />
          </Field>
          <Field label="Email Address">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@company.com" required />
          </Field>
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))} placeholder="admin" required />
          </Field>
          <Field label="Mobile Number">
            <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" required />
          </Field>
        </div>

        <div className="setup-bootstrap-section">
          <h4 className="setup-plan__group-title">Security</h4>
          <Field label="Password">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a strong password" required />
          </Field>
          <Field label="Confirm Password">
            <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" required />
          </Field>
        </div>

        <div className="setup-nav">
          <Button variant="ghost" onClick={back}>Back</Button>
          <Button type="submit" variant="primary" loading={busy} icon="shield">Create Administrator</Button>
        </div>
      </form>
    </div>
  );
}