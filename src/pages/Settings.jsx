import { useState, useEffect } from 'react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { Field, Input } from '../components/ui/Field.jsx';
import PermissionGate from '../components/ui/PermissionGate.jsx';
import { PERMISSIONS } from '../identity/rbac/permissions.js';
import { settingsApiService } from '../services/settings/SettingsApiService.js';
import { notificationManager } from '../managers/NotificationManager.js';


const DATE_FORMATS = [
  'DD-MM-YYYY',
  'MM-DD-YYYY',
  'YYYY-MM-DD',
  'YYYY/MM/DD',
];
const TIME_FORMATS = ['12-hour', '24-hour'];
const WEEK_STARTS = ['Monday', 'Sunday', 'Saturday'];

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({});
  const [original, setOriginal] = useState({});
  const [dirty, setDirty] = useState(false);

  const [roles, setRoles] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  

  // Helper to fetch roles
  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      const data = await res.json();
      setRoles(data.roles || []);
    } catch { /* ignore */ }
  };
  // Helper to fetch languages
  const fetchLanguages = async () => {
    try {
      const res = await fetch('/api/languages');
      const data = await res.json();
      setLanguages(data.languages || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const data = await settingsApiService.getAll();
        setValues(data);
        setOriginal(data);
        if (data.logo) setLogoPreview(data.logo);
        fetchRoles();
        fetchLanguages();
      } catch {
        notificationManager.error('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const isDirty = JSON.stringify(values) !== JSON.stringify(original);
    setDirty(isDirty);
  }, [values, original]);

  const handleChange = (key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    // optimistically preview and remember logo path for save
    handleChange('logo', url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // In a real implementation you would upload the file here.
      // We assume the backend will accept the data already stored in values.logo
      await settingsApiService.update(values);
      setOriginal(values);
      notificationManager.success('Settings saved.');
    } catch (err) {
      notificationManager.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Discard unsaved changes?')) {
      setValues(original);
      setDirty(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <h1>Loading settings…</h1>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page__title">General Settings</h1>
      <PermissionGate permission={PERMISSIONS.SETTINGS_READ} fallback={<Card><p>Access denied.</p></Card>}>        
        <Card title="Website Logo">
          <div style={{ marginBottom: 16 }}>
            {logoPreview && <img src={logoPreview} alt="Logo preview" style={{ maxHeight: 120, borderRadius: 4, border: '1px solid #ddd' }} />}
            <div style={{ marginTop: 8 }}>
              <input type="file" accept="image/*" ref={logoInputRef} onChange={handleLogoSelect} />
            </div>
          </div>
        </Card>
        <Card title="Site Information">
          <form onSubmit={handleSubmit}>
            <Field label="Site Title"><Input value={values.siteTitle || ''} onChange={(e) => handleChange('siteTitle', e.target.value)} placeholder="Your application name" /></Field>
            <Field label="Tagline"><Input value={values.tagline || ''} onChange={(e) => handleChange('tagline', e.target.value)} placeholder="Short description" /></Field>
            <Field label="Website URL"><Input value={values.siteUrl || ''} onChange={(e) => handleChange('siteUrl', e.target.value)} placeholder="https://example.com" /></Field>
            <Field label="Application URL"><Input value={values.appUrl || ''} onChange={(e) => handleChange('appUrl', e.target.value)} placeholder="https://app.example.com" /></Field>
            <Field label="Support Email"><Input value={values.supportEmail || ''} onChange={(e) => handleChange('supportEmail', e.target.value)} placeholder="support@example.com" type="email" /></Field>
            <Field label="Contact Number"><Input value={values.contactNumber || ''} onChange={(e) => handleChange('contactNumber', e.target.value)} placeholder="+1 555‑123‑4567" /></Field>
            <Field label="Membership Mode">
              <select value={values.membershipMode || ''} onChange={(e) => handleChange('membershipMode', e.target.value)}>
                <option value="public">Public Registration</option>
                <option value="invitation">Invitation Only</option>
                <option value="approval">Administrator Approval</option>
              </select>
            </Field>
            <Field label="Default Role">
              <select value={values.defaultRole || ''} onChange={(e) => handleChange('defaultRole', e.target.value)}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Language">
              <select value={values.language || ''} onChange={(e) => handleChange('language', e.target.value)}>
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Timezone">
              <select value={values.timezone || ''} onChange={(e) => handleChange('timezone', e.target.value)}>
                {Intl.supportedValuesOf('timeZone').slice(0, 150).map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </Field>
            <Field label="Date Format">
              <select value={values.dateFormat || ''} onChange={(e) => handleChange('dateFormat', e.target.value)}>
                {DATE_FORMATS.map((fmt) => (
                  <option key={fmt} value={fmt}>{fmt}</option>
                ))}
              </select>
            </Field>
            <Field label="Time Format">
              <select value={values.timeFormat || ''} onChange={(e) => handleChange('timeFormat', e.target.value)}>
                {TIME_FORMATS.map((fmt) => (
                  <option key={fmt} value={fmt}>{fmt}</option>
                ))}
              </select>
            </Field>
            <Field label="Week Starts On">
              <select value={values.weekStart || ''} onChange={(e) => handleChange('weekStart', e.target.value)}>
                {WEEK_STARTS.map((opt) => (<option key={opt} value={opt.toLowerCase()}>{opt}</option>))}
              </select>
            </Field>
            <PermissionGate permission={PERMISSIONS.SETTINGS_UPDATE}>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <Button type="submit" loading={saving} icon="settings">Save</Button>
                <Button variant="secondary" onClick={handleReset}>Reset</Button>
              </div>
            </PermissionGate>
          </form>
        </Card>
        {/* Additional Settings sections could be added here */}
      </PermissionGate>

      {dirty && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', padding: '8px 16px', boxShadow: '0 -2px 6px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <span>Unsaved changes</span>
          <Button variant="secondary" onClick={handleReset}>Reset</Button>
          <Button type="button" variant="primary" onClick={handleSubmit} loading={saving} icon="settings">Save Changes</Button>
        </div>
      )}
    </div>
  );
}
