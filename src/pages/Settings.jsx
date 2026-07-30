import { useState, useEffect, useCallback, useMemo } from 'react';
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
      const data = await settingsApiService.getAll();
      setValues(data);
      setOriginal(data);
      if (data.logo) setLogoPreview(data.logo);
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
      if (logoFile) {
        const reader = new FileReader();
        const fileData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
        values.logo = fileData;
        await fetch('/api/settings/logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileData }),
        });
      }

      await settingsApiService.update(values);
      setOriginal({ ...values });
      setLogoFile(null);
      setValidationErrors({});
      notificationManager.successLoading(loadingId, 'Settings saved', 'All changes have been applied.');

      // Broadcast changes to all listeners (live UI sync)
      Object.entries(values).forEach(([key, value]) => {
        settingsManager.listeners.get(key)?.forEach((fn) => fn(value));
      });
      // Notify settingsManager change for global sync
      settingsManager.notifyChange?.(values);
      // Invalidate cache for live UI refresh
      await invalidateCache('settings');
    } catch (err) {
      notificationManager.errorLoading(loadingId, 'Failed to save', err.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [values, logoFile]);

  const handleReset = useCallback(() => {
    if (dirty) {
      setConfirmMode('reset');
      setConfirmAction(() => () => {
        setValues({ ...original });
        if (original.logo) setLogoPreview(original.logo);
        else setLogoPreview(null);
        setLogoFile(null);
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
      <div className="gs-page">
        <div className="gs-topbar" style={{ justifyContent:'center' }}>
          <Skeleton height={24} width="200px" />
        </div>
        <div className="gs-layout">
          <div className="gs-sidenav"><Skeleton height={20} width="80%" /><Skeleton height={12} count={10} /></div>
          <div className="gs-content">
            <Skeleton height={28} width="60%" />
            <div style={{ marginTop: 16 }}><Skeleton height={200} /></div>
            <div style={{ marginTop: 16 }}><Skeleton height={300} /></div>
          </div>
          <div className="gs-toc"><Skeleton height={16} width="80%" /><Skeleton height={12} count={5} /></div>
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
    <div className="gs-page">
      {/* ===== Top Bar ===== */}
      <div className="gs-topbar">
        <div className="gs-topbar__left">
          <div className="gs-topbar__icon"><Icon name="settings" size={18} /></div>
          <h1 className="gs-topbar__title">Settings</h1>
        </div>
        <div className="gs-topbar__right">
          <div className="gs-topbar__search">
            <Icon name="search" size={14} />
            <input type="text" placeholder="Search anything..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <span className="gs-topbar__kbd">Ctrl+K</span>
          </div>
        </div>
      </div>

      <div className="gs-layout">
        {/* ===== Side Nav ===== */}
        <nav className="gs-sidenav">
          <div className="gs-sidenav__section-label">MAIN</div>
          <div className="gs-sidenav__nav">
            <button type="button" className="gs-sidenav__item gs-sidenav__item--active">
              <Icon name="settings" size={16} />
              General Settings
              <Icon name="chevron-right" size={14} className="gs-sidenav__chevron" />
            </button>
          </div>
        </nav>

        {/* ===== Center Content ===== */}
        <PermissionGate permission={PERMISSIONS.SETTINGS_READ} fallback={<EmptyState icon="lock" title="Access denied" message="You don't have permission to view settings." />}>
          <div className="gs-content">
            <div className="gs-content__header">
              <div>
                <h2 className="gs-content__title">General Settings</h2>
                <p className="gs-content__subtitle">Configure your application settings</p>
              </div>
              <PermissionGate permission={PERMISSIONS.SETTINGS_UPDATE}>
                <button className="gs-save-btn gs-save-btn--sm" onClick={handleSave} disabled={saving}>
                  <Icon name="save" size={14} /> Save Changes
                </button>
              </PermissionGate>
            </div>

            {/* ===== Logo Panel ===== */}
            <div className="gs-panel" id="section-logo">
              <div className="gs-panel__accent" />
              <div className="gs-panel__inner">
                <div className="gs-panel__header"><Icon name="image" size={16} /> Website Logo</div>
                <div className="gs-fields">
                  <div className="gs-field-row">
                    <div className="gs-field-label-col">
                      <label className="gs-field-label">Logo</label>
                      <span className="gs-field-desc">Upload your brand logo</span>
                    </div>
                    <div className="gs-field-control-col" style={{ flexDirection:'column', alignItems:'flex-start' }}>
                      {logoPreview ? (
                        <div className="gs-logo-upload__preview">
                          <img src={logoPreview} alt="Website logo preview" className="gs-logo-upload__img" />
                          <div className="gs-logo-upload__actions">
                            <button className="gs-file-upload" onClick={() => document.getElementById('logo-file-input')?.click()}>Replace</button>
                            <button className="gs-file-upload gs-logo-upload__remove" onClick={handleLogoRemove}>Remove</button>
                          </div>
                        </div>
                      ) : (
                        <div className={`gs-logo-upload__placeholder${logoDragOver ? ' gs-logo-upload__placeholder--active' : ''}`}
                          onDragOver={handleLogoDragOver} onDragLeave={handleLogoDragLeave} onDrop={handleLogoDrop}
                          onClick={() => document.getElementById('logo-file-input')?.click()}>
                          <Icon name="upload" size={22} />
                          <span>Upload logo</span>
                        </div>
                      )}
                      <input id="logo-file-input" type="file" accept=".png,.jpg,.jpeg,.svg,.webp" className="gs-logo-upload__input" onChange={handleLogoInputChange} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Site Information Panel ===== */}
            <div className="gs-panel">
              <div className="gs-panel__accent" />
              <div className="gs-panel__inner">
                <div className="gs-panel__header"><Icon name="info" size={16} /> Site Information</div>
                <div className="gs-fields">
                  <div className="gs-field-row" id="section-site-title">
                    <div className="gs-field-label-col">
                      <label className="gs-field-label">Site Title</label>
                      <span className="gs-field-desc">Your application name</span>
                    </div>
                    <div className="gs-field-control-col" style={{ flexDirection:'column', alignItems:'flex-start' }}>
                      <input className="gs-plain-input" value={values.siteTitle || ''} onChange={e => handleChange('siteTitle', e.target.value)} placeholder="Your application name" />
                      {validationErrors.siteTitle && <div className="alert alert-danger alert--danger-mt">{validationErrors.siteTitle[0]}</div>}
                    </div>
                  </div>
                  <div className="gs-field-row" id="section-tagline">
                    <div className="gs-field-label-col">
                      <label className="gs-field-label">Tagline</label>
                      <span className="gs-field-desc">Short description of your app</span>
                    </div>
                    <div className="gs-field-control-col">
                      <input className="gs-plain-input" value={values.tagline || ''} onChange={e => handleChange('tagline', e.target.value)} placeholder="Short description" />
                    </div>
                  </div>
                  <div className="gs-field-row" id="section-site-url">
                    <div className="gs-field-label-col">
                      <label className="gs-field-label">Website URL</label>
                      <span className="gs-field-desc">Your public website address</span>
                    </div>
                    <div className="gs-field-control-col" style={{ flexDirection:'column', alignItems:'flex-start' }}>
                      <input className="gs-plain-input" value={values.siteUrl || ''} onChange={e => handleChange('siteUrl', e.target.value)} placeholder="https://example.com" />
                      {validationErrors.siteUrl && <div className="alert alert-danger alert--danger-mt">{validationErrors.siteUrl[0]}</div>}
                    </div>
                  </div>
                  <div className="gs-field-row" id="section-app-url">
                    <div className="gs-field-label-col">
                      <label className="gs-field-label">Application URL</label>
                      <span className="gs-field-desc">Your app instance address</span>
                    </div>
                    <div className="gs-field-control-col" style={{ flexDirection:'column', alignItems:'flex-start' }}>
                      <input className="gs-plain-input" value={values.appUrl || ''} onChange={e => handleChange('appUrl', e.target.value)} placeholder="https://app.example.com" />
                      {validationErrors.appUrl && <div className="alert alert-danger alert--danger-mt">{validationErrors.appUrl[0]}</div>}
                    </div>
                  </div>
                  <div className="gs-field-row" id="section-support-email">
                    <div className="gs-field-label-col">
                      <label className="gs-field-label">Support Email</label>
                      <span className="gs-field-desc">Contact email for support</span>
                    </div>
                    <div className="gs-field-control-col" style={{ flexDirection:'column', alignItems:'flex-start' }}>
                      <input className="gs-plain-input" value={values.supportEmail || ''} onChange={e => handleChange('supportEmail', e.target.value)} placeholder="support@example.com" type="email" />
                      {validationErrors.supportEmail && <div className="alert alert-danger alert--danger-mt">{validationErrors.supportEmail[0]}</div>}
                    </div>
                  </div>
                  <div className="gs-field-row" id="section-contact-number">
                    <div className="gs-field-label-col">
                      <label className="gs-field-label">Contact Number</label>
                      <span className="gs-field-desc">Primary contact phone</span>
                    </div>
                    <div className="gs-field-control-col" style={{ flexDirection:'column', alignItems:'flex-start' }}>
                      <input className="gs-plain-input" value={values.contactNumber || ''} onChange={e => handleChange('contactNumber', e.target.value)} placeholder="+1 555-123-4567" />
                      {validationErrors.contactNumber && <div className="alert alert-danger alert--danger-mt">{validationErrors.contactNumber[0]}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Membership Panel ===== */}
            <div className="gs-panel">
              <div className="gs-panel__accent" />
              <div className="gs-panel__inner">
                <div className="gs-panel__header"><Icon name="users" size={16} /> Membership</div>
                <div className="gs-fields">
                  <div className="gs-field-row" id="section-membership">
                    <div className="gs-field-label-col">
                      <label className="gs-field-label">Membership Mode</label>
                      <span className="gs-field-desc">How new users can join</span>
                    </div>
                    <div className="gs-field-control-col">
                      <div className="gs-select-wrap">
                        <Select className="gs-select" options={MEMBERSHIP_OPTIONS} value={values.membershipMode || ''} onChange={val => handleChange('membershipMode', val)} placeholder="Select membership mode" />
                        <Icon name="chevron-down" size={14} />
                      </div>
                    </div>
                  </div>
                  <div className="gs-field-row" id="section-default-role">
                    <div className="gs-field-label-col">
                      <label className="gs-field-label">New User Default Role</label>
                      <span className="gs-field-desc">Role assigned on registration</span>
                    </div>
                    <div className="gs-field-control-col">
                      <div className="gs-select-wrap">
                        <Select className="gs-select" options={roles.map(r => ({ value: r.id, label: r.name }))} value={values.defaultRole || ''} onChange={val => handleChange('defaultRole', val)} placeholder="Select default role" />
                        <Icon name="chevron-down" size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Localization Panel ===== */}
            <div className="gs-panel">
              <div className="gs-panel__accent" />
              <div className="gs-panel__inner">
                <div className="gs-panel__header"><Icon name="globe" size={16} /> Localization</div>
                <div className="gs-fields">
                  <div className="gs-field-row" id="section-language">
                    <div className="gs-field-label-col">
                      <label className="gs-field-label">Language</label>
                      <span className="gs-field-desc">Default UI language</span>
                    </div>
                    <div className="gs-field-control-col">
                      <div className="gs-select-wrap">
                        <Select className="gs-select" options={languages.map(l => ({ value: l.code, label: `${l.nativeName} (${l.name})` }))} value={values.language || ''} onChange={val => handleChange('language', val)} placeholder="Select language" />
                        <Icon name="chevron-down" size={14} />
                      </div>
                    </div>
                  </div>
                  <div className="gs-field-row" id="section-timezone">
                    <div className="gs-field-label-col">
                      <label className="gs-field-label">Timezone</label>
                      <span className="gs-field-desc">Default timezone</span>
                    </div>
                    <div className="gs-field-control-col">
                      <div className="gs-select-wrap">
                        <Select className="gs-select" options={tzOptions} value={values.timezone || ''} onChange={val => handleChange('timezone', val)} placeholder="Select timezone" />
                        <Icon name="chevron-down" size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Date & Time Panel ===== */}
            <div className="gs-panel">
              <div className="gs-panel__accent" />
              <div className="gs-panel__inner">
                <div className="gs-panel__header"><Icon name="calendar" size={16} /> Date &amp; Time</div>
                <div className="gs-fields">
                  <div className="gs-field-row" id="section-date-format">
                    <div className="gs-field-label-col">
                      <label className="gs-field-label">Date Format</label>
                      <span className="gs-field-desc">How dates are displayed</span>
                    </div>
                    <div className="gs-field-control-col" style={{ flexDirection:'column', alignItems:'flex-start' }}>
                      <div className="gs-select-wrap" style={{ width:'100%' }}>
                        <Select className="gs-select" options={DATE_FORMATS} value={values.dateFormat || ''} onChange={val => handleChange('dateFormat', val)} placeholder="Select date format" />
                        <Icon name="chevron-down" size={14} />
                      </div>
                      <div className="gs-date-preview">
                        <span className="gs-date-preview__label">Preview:</span>
                        <span className="gs-date-preview__value">{formatDatePreview(values.dateFormat || 'DD-MM-YYYY')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="gs-field-row" id="section-time-format">
                    <div className="gs-field-label-col">
                      <label className="gs-field-label">Time Format</label>
                      <span className="gs-field-desc">How times are displayed</span>
                    </div>
                    <div className="gs-field-control-col" style={{ flexDirection:'column', alignItems:'flex-start' }}>
                      <div className="gs-select-wrap" style={{ width:'100%' }}>
                        <Select className="gs-select" options={TIME_FORMATS} value={values.timeFormat || ''} onChange={val => handleChange('timeFormat', val)} placeholder="Select time format" />
                        <Icon name="chevron-down" size={14} />
                      </div>
                      <div className="gs-date-preview">
                        <span className="gs-date-preview__label">Preview:</span>
                        <span className="gs-date-preview__value">{formatTimePreview(values.timeFormat || '24-hour')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="gs-field-row" id="section-week-start">
                    <div className="gs-field-label-col">
                      <label className="gs-field-label">Week Starts On</label>
                      <span className="gs-field-desc">First day of the week</span>
                    </div>
                    <div className="gs-field-control-col">
                      <div className="gs-select-wrap">
                        <Select className="gs-select" options={WEEK_STARTS_OPTIONS} value={values.weekStart || ''} onChange={val => handleChange('weekStart', val)} placeholder="Select first day of week" />
                        <Icon name="chevron-down" size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Footer ===== */}
            <PermissionGate permission={PERMISSIONS.SETTINGS_UPDATE}>
              <div className="gs-footer">
                <button className="gs-save-btn" style={{ background:'transparent', color:'var(--text-soft)', border:'1px solid var(--border)' }} onClick={handleReset}>Reset All</button>
                <button className="gs-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? <Icon name="spinner" size={15} /> : <Icon name="save" size={15} />} Save Changes
                </button>
              </div>
            </PermissionGate>
          </div>
        </PermissionGate>

        {/* ===== Right Sidebar / TOC ===== */}
        <aside className="gs-toc">
          <div className="gs-toc__title">In This Section</div>
          <div className="gs-toc__list">
            {TOC_ITEMS.map(item => (
              <div key={item.id} className="gs-toc__item"
                onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}>
                {item.label}
              </div>
            ))}
          </div>
          <div className="gs-toc__help">
            <div className="gs-toc__help-title">Need Help?</div>
            <div className="gs-toc__help-sub">Check our documentation or contact support.</div>
            <button className="gs-toc__help-btn"><Icon name="external-link" size={13} /> View Docs</button>
          </div>
        </aside>
      </div>

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