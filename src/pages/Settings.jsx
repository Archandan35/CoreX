import { useState } from 'react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { Field, Input } from '../components/ui/Field.jsx';
import PermissionGate from '../components/ui/PermissionGate.jsx';
import Icon from '../components/ui/Icon.jsx';
import { PERMISSIONS } from '../identity/rbac/permissions.js';
import { settingsApiService } from '../services/settings/SettingsApiService.js';
import { config } from '../config/index.js';
import { useAuth } from '../identity/auth/AuthContext.jsx';

function AuthRedirectUrls() {
  const { hasFullAccess } = useAuth();
  const [copied, setCopied] = useState('');
  if (!hasFullAccess) return null;

  const base = config.appUrl;
  const urls = [
    { label: 'Site URL', value: base },
    { label: 'Email confirmation redirect', value: `${base}/login` },
    { label: 'Password recovery redirect', value: `${base}/login` },
    { label: 'Magic link redirect', value: `${base}/login` },
  ];

  const copy = (value) => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(value);
      setTimeout(() => setCopied(''), 1500);
    });
  };

  return (
    <Card
      title="Authentication URLs"
      subtitle="These are resolved from this environment's configuration (never hard-coded). Paste them into Supabase Dashboard → Authentication → URL Configuration for this environment."
      className="settings-auth-urls"
    >
      <ul className="auth-url-list">
        {urls.map((u) => (
          <li key={u.label} className="auth-url-list__item">
            <span className="auth-url-list__label">{u.label}</span>
            <code className="auth-url-list__value">{u.value}</code>
            <Button variant="secondary" icon={copied === u.value ? 'check' : 'link'} onClick={() => copy(u.value)}>
              {copied === u.value ? 'Copied' : 'Copy'}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function Settings() {
  const [siteTitle, setSiteTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      await settingsApiService.update({ siteTitle });
      setSaved(true);
    } catch {
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Settings</h1>
      </div>
      <PermissionGate permission={PERMISSIONS.SETTINGS_READ} fallback={
        <Card><p>You do not have permission to view settings.</p></Card>
      }>
        <AuthRedirectUrls />
        <Card title="General Settings">
          {saved && <div className="alert alert-success alert--mb"><Icon name="check" size={16} />Settings saved.</div>}
          <form onSubmit={submit}>
            <Field label="Site Title">
              <Input value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} placeholder="My Application" />
            </Field>
            <PermissionGate permission={PERMISSIONS.SETTINGS_UPDATE}>
              <div className="form-actions">
                <Button type="submit" loading={busy} icon="settings">Save Settings</Button>
              </div>
            </PermissionGate>
          </form>
        </Card>
      </PermissionGate>
    </div>
  );
}
