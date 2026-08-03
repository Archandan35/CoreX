import { useState, useEffect, useCallback, useMemo } from 'react';
import Button from '../components/ui/Button.jsx';
import { Field, Input } from '../components/ui/Field.jsx';
import Select from '../components/ui/Select.jsx';
import Icon from '../components/ui/Icon.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import PermissionGate from '../components/ui/PermissionGate.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { PERMISSIONS } from '../identity/rbac/permissions.js';
import { settingsApiService } from '../services/settings/SettingsApiService.js';
import { notificationManager } from '../managers/NotificationManager.js';
import { settingsManager } from '../managers/SettingsManager.js';
import { validateSettings } from '../business/validation/SettingsValidator.js';
import { invalidateCache } from '../services/ui-sync/index.js';

const MEMBERSHIP_OPTIONS = [
  { value: 'public', label: 'Public Registration' },
  { value: 'invitation', label: 'Invitation Only' },
  { value: 'approval', label: 'Administrator Approval' },
];

const DATE_FORMATS = [
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
  { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
];

const TIME_FORMATS = [
  { value: '12-hour', label: '12-Hour' },
  { value: '24-hour', label: '24-Hour' },
];

const TOC_ITEMS = [
  { id: 'section-logo', label: 'Website Logo' },
  { id: 'section-favicon', label: 'Favicon' },
  { id: 'section-site-title', label: 'Site Title' },
  { id: 'section-tagline', label: 'Tagline' },
  { id: 'section-site-url', label: 'Website URL' },
  { id: 'section-app-url', label: 'Application URL' },
  { id: 'section-support-email', label: 'Support Email' },
  { id: 'section-contact-number', label: 'Contact Number' },
  { id: 'section-membership', label: 'Membership Mode' },
  { id: 'section-default-role', label: 'Default Role' },
  { id: 'section-language', label: 'Language' },
  { id: 'section-timezone', label: 'Timezone' },
  { id: 'section-date-format', label: 'Date Format' },
  { id: 'section-time-format', label: 'Time Format' },
  { id: 'section-week-start', label: 'Week Starts On' },
];

const WEEK_STARTS_OPTIONS = [
  { value: 'monday', label: 'Monday' },
  { value: 'sunday', label: 'Sunday' },
  { value: 'saturday', label: 'Saturday' },
];

function formatDatePreview(format) {
  const date = new Date(2026, 6, 28);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  const map = {
    'DD-MM-YYYY': `${d}-${m}-${y}`,
    'MM-DD-YYYY': `${m}-${d}-${y}`,
    'YYYY-MM-DD': `${y}-${m}-${d}`,
    'YYYY/MM/DD': `${y}/${m}/${d}`,
    'DD.MM.YYYY': `${d}.${m}.${y}`,
    'MM/DD/YYYY': `${m}/${d}/${y}`,
  };
  return map[format] || format;
}

function formatTimePreview(format) {
  const now = new Date();
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  if (format === '12-hour') {
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m} ${ampm}`;
  }
  return `${String(h).padStart(2, '0')}:${m}`;
}

function getUTCOffset(tz) {
  try {
    const formatter = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' });
    const parts = formatter.formatToParts(new Date());
    const offset = parts.find((p) => p.type === 'timeZoneName');
    return offset ? offset.value : '';
  } catch {
    return '';
  }
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({});
  const [original, setOriginal] = useState({});
  const [dirty, setDirty] = useState(false);

  const [roles, setRoles] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [allTimezones, setAllTimezones] = useState([]);

  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoDragOver, setLogoDragOver] = useState(false);

  const [faviconPreview, setFaviconPreview] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [faviconDragOver, setFaviconDragOver] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMode, setConfirmMode] = useState('leave');
  const [validationErrors, setValidationErrors] = useState({});

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/roles');
      const data = await res.json();
      setRoles(data.roles || []);
    } catch {}
  }, []);

  const fetchLanguages = useCallback(async () => {
    try {
      const res = await fetch('/api/languages');
      const data = await res.json();
      setLanguages(data.languages || []);
    } catch {}
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await settingsApiService.getAll();
      const data = res?.settings || res || {};
      setValues(data);
      setOriginal(data);
      if (data.logo) setLogoPreview(data.logo);
      if (data.favicon) setFaviconPreview(data.favicon);
      fetchRoles();
      fetchLanguages();
      setAllTimezones(Intl.supportedValuesOf('timeZone'));
    } catch (e) {
      setError(e.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, [fetchRoles, fetchLanguages]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const isDirty = JSON.stringify(values) !== JSON.stringify(original);
    setDirty(isDirty);
  }, [values, original]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const handleChange = useCallback((key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setValidationErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const handleLogoSelect = useCallback((file) => {
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      notificationManager.error('Invalid file type. Please use PNG, JPG, JPEG, SVG, or WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notificationManager.error('File too large. Maximum size is 5MB.');
      return;
    }
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    setDirty(true);
  }, []);

  const handleLogoInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleLogoSelect(file);
    if (e.target) e.target.value = '';
  }, [handleLogoSelect]);

  const handleLogoDrop = useCallback((e) => {
    e.preventDefault();
    setLogoDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleLogoSelect(file);
  }, [handleLogoSelect]);

  const handleLogoRemove = useCallback(() => {
    setLogoPreview(null);
    setLogoFile(null);
    handleChange('logo', '');
  }, [handleChange]);

  const handleLogoDragOver = useCallback((e) => {
    e.preventDefault();
    setLogoDragOver(true);
  }, []);

  const handleLogoDragLeave = useCallback(() => {
    setLogoDragOver(false);
  }, []);

  const handleFaviconSelect = useCallback((file) => {
    const validTypes = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(ico|png|svg)$/i)) {
      notificationManager.error('Invalid format', 'Favicon must be ICO, PNG, or SVG.');
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      notificationManager.error('File too large', 'Favicon must be under 1MB.');
      return;
    }
    setFaviconFile(file);
    const url = URL.createObjectURL(file);
    setFaviconPreview(url);
  }, []);

  const handleFaviconInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleFaviconSelect(file);
  }, [handleFaviconSelect]);

  const handleFaviconDrop = useCallback((e) => {
    e.preventDefault();
    setFaviconDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFaviconSelect(file);
  }, [handleFaviconSelect]);

  const handleFaviconRemove = useCallback(() => {
    setFaviconPreview(null);
    setFaviconFile(null);
    handleChange('favicon', '');
  }, [handleChange]);

  const handleFaviconDragOver = useCallback((e) => {
    e.preventDefault();
    setFaviconDragOver(true);
  }, []);

  const handleFaviconDragLeave = useCallback(() => {
    setFaviconDragOver(false);
  }, []);

  const handleSave = useCallback(async () => {
    const validation = validateSettings(values);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      const errors = Object.entries(validation.errors);
      const msgs = errors.map(([field, ms]) => `${field}: ${ms[0]}`);
      notificationManager.error('Validation failed', msgs.join('; '));
      return;
    }

    setSaving(true);
    const loadingId = notificationManager.loading('Saving settings', 'Please wait...');

    try {
      let finalValues = { ...values };

      if (logoFile) {
        const reader = new FileReader();
        const fileData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
        const logoRes = await fetch('/api/settings/logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileData }),
        });
        const logoJson = await logoRes.json().catch(() => ({}));
        const logoUrl = logoJson?.url || logoJson?.path || fileData;
        finalValues = { ...finalValues, logo: logoUrl };
        setLogoPreview(logoUrl);
      }

      if (faviconFile) {
        const reader = new FileReader();
        const fileData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(faviconFile);
        });
        finalValues = { ...finalValues, favicon: fileData };
        setFaviconPreview(fileData);
      }

      await settingsApiService.update(finalValues);
      setOriginal({ ...finalValues });
      setLogoFile(null);
      setFaviconFile(null);
      setValidationErrors({});

      // Update favicon immediately in browser tab
      if (finalValues.favicon) {
        let link = document.querySelector('link[rel="icon"]');
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = finalValues.favicon;
      }

      notificationManager.successLoading(loadingId, 'Settings saved', 'All changes have been applied.');

      // Broadcast changes to all listeners (live UI sync)
      Object.entries(finalValues).forEach(([key, value]) => {
        settingsManager.listeners.get(key)?.forEach((fn) => fn(value));
      });
      // Notify settingsManager change for global sync
      settingsManager.notifyChange?.(finalValues);
      // Invalidate cache for live UI refresh
      await invalidateCache('settings');
    } catch (err) {
      notificationManager.errorLoading(loadingId, 'Failed to save', err.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [values, logoFile, faviconFile]);

  const handleReset = useCallback(() => {
    if (dirty) {
      setConfirmMode('reset');
      setConfirmAction(() => () => {
        setValues({ ...original });
        if (original.logo) setLogoPreview(original.logo);
        else setLogoPreview(null);
        if (original.favicon) setFaviconPreview(original.favicon);
        else setFaviconPreview(null);
        setLogoFile(null);
        setFaviconFile(null);
        setValidationErrors({});
        setDirty(false);
        setConfirmOpen(false);
      });
      setConfirmOpen(true);
    } else {
      setValues({ ...original });
    }
  }, [dirty, original]);

  const handleLeaveConfirm = useCallback(() => {
    confirmAction?.();
    setConfirmOpen(false);
  }, [confirmAction]);

  const handleSaveBeforeLeave = useCallback(async () => {
    await handleSave();
    setConfirmOpen(false);
  }, [handleSave]);

  const [searchQuery, setSearchQuery] = useState('');
  const tzOptions = useMemo(() => {
    return allTimezones.map((tz) => ({
      value: tz,
      label: `${tz} (${getUTCOffset(tz)})`,
    }));
  }, [allTimezones]);

  if (loading) {
    return (
      <div className="page" style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
        <div className="settings-topbar" style={{ justifyContent:'center' }}>
          <Skeleton height={24} width="200px" />
        </div>
        <div className="settings-body">
          <div className="settings-nav"><Skeleton height={20} width="80%" /><Skeleton height={12} count={10} /></div>
          <div className="settings-center">
            <Skeleton height={28} width="60%" />
            <div style={{ marginTop: 16 }}><Skeleton height={200} /></div>
            <div style={{ marginTop: 16 }}><Skeleton height={300} /></div>
          </div>
          <div className="settings-sidebar"><Skeleton height={16} width="80%" /><Skeleton height={12} count={5} /></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <ErrorState title="Failed to load settings" message={error} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="page" style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
      {/* ===== Top Header Bar ===== */}
      <div className="settings-topbar">
        <div className="settings-topbar-left">
          <Icon name="settings" size={20} />
          <h1 className="settings-topbar-title">Settings</h1>
        </div>
        <div className="settings-topbar-right">
          <div className="settings-search-box">
            <Icon name="search" size={14} />
            <input type="text" placeholder="Search anything..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <span className="settings-search-hint">Ctrl+K</span>
          </div>
        </div>
      </div>

      <PermissionGate permission={PERMISSIONS.SETTINGS_READ} fallback={<EmptyState icon="lock" title="Access denied" message="You don't have permission to view settings." />}>
        <div className="settings-body">
          {/* ===== Left Nav ===== */}
          <nav className="settings-nav">
            <div className="settings-nav-section">
              <div className="settings-nav-section-title">MAIN</div>
              <button type="button" className="settings-nav-item settings-nav-item--active">
                <Icon name="settings" size={16} />
                General Settings
              </button>
            </div>
          </nav>

          {/* ===== Center Content ===== */}
          <div className="settings-center">
            <h2 className="settings-center-title">General Settings</h2>

            <div id="section-logo">
              <h3 className="settings-section-heading">Website Logo</h3>
              <div className="settings-logo-area">
              <div className={`settings-logo-preview${!logoPreview ? ' settings-logo-preview--empty' : ''}`}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Website logo preview" />
                ) : (
                  <><Icon name="image" size={32} strokeWidth={1.5} /><span>No logo</span></>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div className={`settings-logo-dropzone${logoDragOver ? ' settings-logo-dropzone--active' : ''}`}
                  onDragOver={handleLogoDragOver} onDragLeave={handleLogoDragLeave} onDrop={handleLogoDrop}
                  onClick={() => document.getElementById('logo-file-input')?.click()}>
                  <Icon name="upload" size={24} strokeWidth={1.5} className="settings-logo-dropzone__icon" />
                  <div className="settings-logo-dropzone__text">Drag & drop logo here, or click to browse</div>
                  <div className="settings-logo-dropzone__hint">PNG, JPG, JPEG, SVG, WEBP &middot; Max 5MB</div>
                  <input id="logo-file-input" type="file" accept=".png,.jpg,.jpeg,.svg,.webp" style={{ display:'none' }} onChange={handleLogoInputChange} />
                </div>
                {logoPreview && (
                  <div className="settings-logo-actions">
                    <Button variant="secondary" size="sm" onClick={() => document.getElementById('logo-file-input')?.click()}>Replace</Button>
                    <Button variant="danger" size="sm" onClick={handleLogoRemove}>Remove</Button>
                  </div>
                )}
              </div>
            </div>

            </div>

            <div id="section-favicon">
              <h3 className="settings-section-heading">Favicon</h3>
              <div className="settings-logo-area">
              <div className={`settings-logo-preview${!faviconPreview ? ' settings-logo-preview--empty' : ''}`}>
                {faviconPreview ? (
                  <img src={faviconPreview} alt="Favicon preview" style={{ width:48, height:48, objectFit:'contain' }} />
                ) : (
                  <><Icon name="image" size={32} strokeWidth={1.5} /><span>No favicon</span></>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div className={`settings-logo-dropzone${faviconDragOver ? ' settings-logo-dropzone--active' : ''}`}
                  onDragOver={handleFaviconDragOver} onDragLeave={handleFaviconDragLeave} onDrop={handleFaviconDrop}
                  onClick={() => document.getElementById('favicon-file-input')?.click()}>
                  <Icon name="upload" size={24} strokeWidth={1.5} className="settings-logo-dropzone__icon" />
                  <div className="settings-logo-dropzone__text">Drag & drop favicon here, or click to browse</div>
                  <div className="settings-logo-dropzone__hint">PNG, ICO, SVG &middot; Max 1MB</div>
                  <input id="favicon-file-input" type="file" accept=".png,.ico,.svg" style={{ display:'none' }} onChange={handleFaviconInputChange} />
                </div>
                {faviconPreview && (
                  <div className="settings-logo-actions">
                    <Button variant="secondary" size="sm" onClick={() => document.getElementById('favicon-file-input')?.click()}>Replace</Button>
                    <Button variant="danger" size="sm" onClick={handleFaviconRemove}>Remove</Button>
                  </div>
                )}
              </div>
            </div>
            </div>

            <div id="section-site-title">
              <Field label="Site Title" required>
              <Input value={values.siteTitle || ''} onChange={e => handleChange('siteTitle', e.target.value)} placeholder="Your application name" />
              {validationErrors.siteTitle && <div className="alert alert-danger alert--danger-mt">{validationErrors.siteTitle[0]}</div>}
            </Field>
            </div>

            <div id="section-tagline">
              <Field label="Tagline">
              <Input value={values.tagline || ''} onChange={e => handleChange('tagline', e.target.value)} placeholder="Short description" />
            </Field>
            </div>

            <div id="section-site-url">
              <Field label="Website URL">
              <Input value={values.siteUrl || ''} onChange={e => handleChange('siteUrl', e.target.value)} placeholder="https://example.com" />
              {validationErrors.siteUrl && <div className="alert alert-danger alert--danger-mt">{validationErrors.siteUrl[0]}</div>}
            </Field>
            </div>

            <div id="section-app-url">
              <Field label="Application URL">
              <Input value={values.appUrl || ''} onChange={e => handleChange('appUrl', e.target.value)} placeholder="https://app.example.com" />
              {validationErrors.appUrl && <div className="alert alert-danger alert--danger-mt">{validationErrors.appUrl[0]}</div>}
            </Field>
            </div>

            <div id="section-support-email">
              <Field label="Support Email">
              <Input value={values.supportEmail || ''} onChange={e => handleChange('supportEmail', e.target.value)} placeholder="support@example.com" type="email" />
              {validationErrors.supportEmail && <div className="alert alert-danger alert--danger-mt">{validationErrors.supportEmail[0]}</div>}
            </Field>
            </div>

            <div id="section-contact-number">
              <Field label="Contact Number">
              <Input value={values.contactNumber || ''} onChange={e => handleChange('contactNumber', e.target.value)} placeholder="+1 555-123-4567" />
              {validationErrors.contactNumber && <div className="alert alert-danger alert--danger-mt">{validationErrors.contactNumber[0]}</div>}
            </Field>
            </div>

            <div id="section-membership">
              <Field label="Membership Mode">
              <Select options={MEMBERSHIP_OPTIONS} value={values.membershipMode || ''} onChange={val => handleChange('membershipMode', val)} placeholder="Select membership mode" />
            </Field>
            </div>

            <div id="section-default-role">
              <Field label="New User Default Role">
              <Select options={roles.map(r => ({ value: r.id, label: r.name }))} value={values.defaultRole || ''} onChange={val => handleChange('defaultRole', val)} placeholder="Select default role" />
            </Field>
            </div>

            <div id="section-language">
              <Field label="Language">
              <Select options={languages.map(l => ({ value: l.code, label: `${l.nativeName} (${l.name})` }))} value={values.language || ''} onChange={val => handleChange('language', val)} placeholder="Select language" />
            </Field>
            </div>

            <div id="section-timezone">
              <Field label="Timezone">
              <Select options={tzOptions} value={values.timezone || ''} onChange={val => handleChange('timezone', val)} placeholder="Select timezone" />
            </Field>
            </div>

            <div id="section-date-format">
              <Field label="Date Format">
              <Select options={DATE_FORMATS} value={values.dateFormat || ''} onChange={val => handleChange('dateFormat', val)} placeholder="Select date format" />
              <div className="settings-format-preview">
                <div className="settings-format-preview__label">Preview</div>
                <div className="settings-format-preview__value">{formatDatePreview(values.dateFormat || 'DD-MM-YYYY')}</div>
              </div>
            </Field>
            </div>

            <div id="section-time-format">
              <Field label="Time Format">
              <Select options={TIME_FORMATS} value={values.timeFormat || ''} onChange={val => handleChange('timeFormat', val)} placeholder="Select time format" />
              <div className="settings-format-preview">
                <div className="settings-format-preview__label">Preview</div>
                <div className="settings-format-preview__value">{formatTimePreview(values.timeFormat || '24-hour')}</div>
              </div>
            </Field>
            </div>

            <div id="section-week-start">
              <Field label="Week Starts On">
              <Select options={WEEK_STARTS_OPTIONS} value={values.weekStart || ''} onChange={val => handleChange('weekStart', val)} placeholder="Select first day of week" />
            </Field>
            </div>
          </div>

          {/* ===== Right Sidebar ===== */}
          <aside className="settings-sidebar">
            <div className="settings-sidebar-section">
              <div className="settings-sidebar-title">In This Section</div>
              {TOC_ITEMS.map(item => (
                <button key={item.id} type="button" className="settings-sidebar-item"
                  onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="settings-help-card">
              <div className="settings-help-card-title">Need Help?</div>
              <p className="settings-help-card-desc">Check our documentation or contact support.</p>
              <button className="settings-help-card-btn"><Icon name="external-link" size={13} /> View Docs</button>
            </div>
          </aside>
        </div>

        {/* ===== Bottom Bar ===== */}
        <div className="settings-bottombar">
          <div className="settings-bottombar-actions">
            <PermissionGate permission={PERMISSIONS.SETTINGS_UPDATE}>
              <Button variant="secondary" onClick={handleReset}>Reset All</Button>
              <Button onClick={handleSave} loading={saving} icon="save">Save Changes</Button>
            </PermissionGate>
          </div>
        </div>
      </PermissionGate>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmAction(null); }}
        onConfirm={handleLeaveConfirm}
        title={confirmMode === 'reset' ? 'Reset Changes' : 'Unsaved Changes'}
        message={confirmMode === 'reset' ? 'Are you sure you want to reset all changes? This will restore the most recently saved configuration.' : 'You have unsaved changes. Would you like to save before leaving?'}
        confirmText={confirmMode === 'reset' ? 'Reset' : 'Discard'}
        cancelText="Cancel"
        variant="danger"
        extraText={confirmMode !== 'reset' ? 'Save' : undefined}
        onExtra={confirmMode !== 'reset' ? handleSaveBeforeLeave : undefined}
        extraLoading={saving}
      />
    </div>
  );
}