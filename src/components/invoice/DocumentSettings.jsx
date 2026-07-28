import { useEffect, useState, useCallback } from 'react';
import Icon from '../ui/Icon.jsx';
import Modal from '../ui/Modal.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { notificationManager } from '../../managers/NotificationManager.js';
import { invoiceService } from '../../services/invoice/index.js';

// Centralised default values so every control has a single source of truth.
// `documentSettings` is persisted as one JSON blob via /api/settings so adding
// new keys only requires extending this object (no backend migration needed).
export const DEFAULT_DOCUMENT_SETTINGS = {
  // Quick actions (which template is selected, etc.) — kept as structured data
  // so future template previews can read from the same object.
  invoiceTemplate: 'classic',
  customFieldsEnabled: false,
  prefixSuffix: { prefix: 'INV', suffix: '' },
  defaultNotesAndTerms: { notes: '', terms: '' },

  // Display tab
  showImages: true,
  showNetBalance: true,
  showPreviousDues: false,
  showDueDate: true,
  showDispatchAddress: true,
  showPayments: true,
  showRoundOff: true,
  showReceiverSignature: false,

  // Quantities
  hideQuantity: false,
  showQuantity3Decimals: false,
  showQuantityConversion: false,

  // Pricing & Discounts
  hideDiscount: false,
  showDiscountColumn: false,
  priceDecimals: '2',

  // Company & HSN/SAC
  hideHsnSac: false,
  showCompanyDetails: true,
  showHsnSacSummary: false,
  hsnSacSummaryOn: '+10...',

  // Layout & Fonts
  pdfLanguage: 'English (Default)',
  pdfFontStyle: 'Stylish',
  pdfFontSize: 'normal', // small | normal | large

  // Page Setup
  pdfOrientation: 'Portrait',
  repeatHeader: false,

  // Table & Content
  enableItemHeaders: false,
  showFullPage: false,
  showStripedRows: false,

  // Margins
  pdfMarginTop: '0',
  pdfMarginBottom: '0',
  pdfMarginLeft: '24',
  pdfMarginRight: '24',

  // Export
  showConversionFactor: false,
  showInr: false,

  // Branding
  pdfAccentColor: '#3815f7e6',
  watermark: '',

  // Which customization pill was last viewed (state-only, not persisted).
  activePillIndex: 0,
};

const QUICK_ACTIONS = [
  { key: 'invoiceTemplate', icon: 'heart', title: 'Invoice templates', desc: 'Professional templates for every business need', locked: false },
  { key: 'customFieldsEnabled', icon: 'gear', title: 'Custom fields', desc: 'Add custom fields in your PDFs', locked: true, type: 'toggle' },
  { key: null, icon: 'list', title: 'Prefixes / suffixes', desc: 'Customize invoice serial numbers and sequences', locked: false },
  { key: 'defaultNotesAndTerms', icon: 'file-text', title: 'Notes and terms', desc: 'Default footer text, terms, and notes', locked: true },
];

const PILLS = [
  { label: 'Display', active: true },
  { label: 'Layout & Fonts', active: false },
  { label: 'Export', active: false },
  { label: 'Branding', active: false },
  { label: 'Customize Labels', locked: true, active: false },
  { label: 'Email / WhatsApp templates', external: true, active: false },
];

export default function DocumentSettings({ open, onClose }) {
  const [settings, setSettings] = useState(DEFAULT_DOCUMENT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load persisted document settings whenever the panel is opened.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    invoiceService.getDocumentSettings()
      .then((persisted) => {
        if (cancelled) return;
        setSettings(prev => ({ ...prev, ...persisted }));
      })
      .catch(() => { /* first-run: keep defaults */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  const update = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);
  const updateNested = useCallback((key, field, value) => {
    setSettings(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await invoiceService.saveDocumentSettings(settings);
      notificationManager.success('Document settings', 'Settings saved.');
      onClose?.();
    } catch (e) {
      notificationManager.error('Document settings', e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }, [settings, onClose]);

  if (!open) return null;

  return (
    <div className="ds-overlay" onClick={onClose}>
      <div className="ds-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ds-header">
          <div className="ds-header-left">
            <button className="ds-close-btn" onClick={onClose}><Icon name="x" size={18} /></button>
            <h2>Document settings</h2>
          </div>
          <PermissionGate permission={PERMISSIONS.SETTINGS_UPDATE}>
            <button className="ds-btn ds-btn-primary" onClick={save} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </PermissionGate>
        </div>

        {/* Body */}
        <div className="ds-body">
          {loading && (
            <div style={{ padding: 12, fontSize: 13, color: 'var(--inv-text-sub)', fontStyle: 'italic' }}>
              Loading settings…
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <div className="ds-section-title">Quick actions</div>
            <div className="ds-qa-grid">
              {QUICK_ACTIONS.map((qa) => (
                <div key={qa.title} className="ds-qa-card" style={{ cursor: qa.type === 'toggle' ? 'pointer' : 'default' }}
                  onClick={qa.type === 'toggle' ? () => update(qa.key, !settings[qa.key]) : undefined}>
                  <div className="ds-qa-icon"><Icon name={qa.icon} size={16} /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="ds-qa-title">{qa.title}</span>
                    {qa.type === 'toggle' ? (
                      <span className="ds-switch">
                        <input
                          type="checkbox"
                          checked={!!settings[qa.key]}
                          onChange={(e) => update(qa.key, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className={`ds-slider${settings[qa.key] ? ' on' : ''}`} />
                      </span>
                    ) : qa.locked && <Icon name="lock" size={12} className="ds-lock" />}
                  </div>
                  <div className="ds-qa-desc">{qa.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Customization Nav */}
          <div>
            <div className="ds-section-title">Customization</div>
            <div className="ds-pills">
              {PILLS.map((pill, i) => (
                <button
                  key={pill.label}
                  className={`ds-pill${i === settings.activePillIndex ? ' active' : ''}`}
                  onClick={() => update('activePillIndex', i)}
                >
                  {pill.label}
                  {pill.locked && <Icon name="lock" size={12} className="ds-lock" />}
                  {pill.external && <Icon name="external-link" size={12} />}
                </button>
              ))}
            </div>
          </div>

          {/* Settings Cards */}
          <div className="ds-content">
            {/* General */}
            <div className="ds-card">
              <div className="ds-card-title">General</div>
              <div className="ds-grid-2">
                <ToggleItem label="Show Images" desc="Show product images on PDFs (up to 10)" checked={settings.showImages} onChange={(v) => update('showImages', v)} />
                <ToggleItem label="Show Net Balance" desc="Show what the customer owes (receivable balance)." checked={settings.showNetBalance} onChange={(v) => update('showNetBalance', v)} />
                <ToggleItem label="Show Previous Dues" desc="Show the customer's current amount, previous due on the invoice" checked={settings.showPreviousDues} onChange={(v) => update('showPreviousDues', v)} />
                <ToggleItem label="Show Due Date" desc="Show due date on PDFs." checked={settings.showDueDate} onChange={(v) => update('showDueDate', v)} />
                <ToggleItem label="Show Dispatch Address" desc="Show dispatch address on PDFs" checked={settings.showDispatchAddress} onChange={(v) => update('showDispatchAddress', v)} />
                <ToggleItem label="Show Payments" desc="Show how and when they paid on PDFs." checked={settings.showPayments} onChange={(v) => update('showPayments', v)} />
                <ToggleItem label="Show Round Off" desc="Show round-off on PDFs." checked={settings.showRoundOff} onChange={(v) => update('showRoundOff', v)} />
                <ToggleItem label="Show Receiver's Signature" desc="Show receiver sign-off on PDFs." checked={settings.showReceiverSignature} onChange={(v) => update('showReceiverSignature', v)} />
              </div>
            </div>

            {/* Quantities */}
            <div className="ds-card">
              <div className="ds-card-title">Quantities</div>
              <div className="ds-grid-2">
                <ToggleItem label="Hide Quantity" desc="Hide quantity on PDFs." checked={settings.hideQuantity} onChange={(v) => update('hideQuantity', v)} />
                <ToggleItem label="Show Quantity with 3 decimals" desc="Show qty with three decimals on PDFs." checked={settings.showQuantity3Decimals} onChange={(v) => update('showQuantity3Decimals', v)} />
                <ToggleItem label="Show Quantity Conversion Rate" desc="Show main unit under the alternate unit" checked={settings.showQuantityConversion} onChange={(v) => update('showQuantityConversion', v)} />
              </div>
            </div>

            {/* Pricing & Discounts */}
            <div className="ds-card">
              <div className="ds-card-title">Pricing & Discounts</div>
              <div className="ds-grid-2">
                <ToggleItem label="Hide Discount" desc="Hide line discounts on PDFs." checked={settings.hideDiscount} onChange={(v) => update('hideDiscount', v)} />
                <ToggleItem label="Show Discount Column" desc="Put discount in its own PDF column." checked={settings.showDiscountColumn} onChange={(v) => update('showDiscountColumn', v)} />
                <SelectField
                  label="Decimals for item prices on PDFs"
                  desc="Unit and tax-included prices on PDFs. Default: 2, up to 6 decimals."
                  locked
                  options={['2']}
                  value={settings.priceDecimals}
                  onChange={(v) => update('priceDecimals', v)}
                  narrow
                />
              </div>
            </div>

            {/* Company & HSN/SAC */}
            <div className="ds-card">
              <div className="ds-card-title">Company & HSN/SAC</div>
              <div className="ds-grid-2">
                <ToggleItem label="Hide HSN/SAC" desc="Hide HSN/SAC on PDFs." checked={settings.hideHsnSac} onChange={(v) => update('hideHsnSac', v)} />
                <ToggleItem label="Show Company Details" desc="Off hides your company block on PDFs (for printed letterhead)." checked={settings.showCompanyDetails} onChange={(v) => update('showCompanyDetails', v)} locked />
                <ToggleItem label="Show HSN/SAC Summary" desc="HSN/SAC summary on PDFs." checked={settings.showHsnSacSummary} onChange={(v) => update('showHsnSacSummary', v)} locked />
                <SelectField
                  label="Show HSN/SAC Summary on"
                  desc="Choose which document types display the HSN/SAC summary table in PDFs."
                  options={['+10...', 'All', 'Invoices only']}
                  value={settings.hsnSacSummaryOn}
                  onChange={(v) => update('hsnSacSummaryOn', v)}
                />
              </div>
            </div>

            {/* Layout & Fonts */}
            <div className="ds-card">
              <div className="ds-card-title">Layout & Fonts</div>
              <div className="ds-grid-2">
                <SelectField label="Select Language in PDF" desc="Uses this language in PDFs when you type text in that language." options={['English (Default)', 'Hindi', 'Tamil']} value={settings.pdfLanguage} onChange={(v) => update('pdfLanguage', v)} />
                <SelectField label="Select Font Style in PDF" desc="English PDFs only." options={['Stylish', 'Modern', 'Classic']} value={settings.pdfFontStyle} onChange={(v) => update('pdfFontStyle', v)} />
              </div>
              <div className="ds-field-group" style={{ marginTop: 16 }}>
                <div className="ds-field-label">PDF font size</div>
                <div className="ds-setting-desc" style={{ marginBottom: 6 }}>All PDFs.</div>
                <div className="ds-radio-group">
                  <label className="ds-radio"><input type="radio" name="fontSize" checked={settings.pdfFontSize === 'small'} onChange={() => update('pdfFontSize', 'small')} /> Small</label>
                  <label className="ds-radio"><input type="radio" name="fontSize" checked={settings.pdfFontSize === 'normal'} onChange={() => update('pdfFontSize', 'normal')} /> Normal</label>
                  <label className="ds-radio"><input type="radio" name="fontSize" checked={settings.pdfFontSize === 'large'} onChange={() => update('pdfFontSize', 'large')} /> Large</label>
                </div>
              </div>
            </div>

            {/* Page Setup */}
            <div className="ds-card">
              <div className="ds-card-title">Page Setup</div>
              <div className="ds-grid-2">
                <SelectField label="PDF Orientation" desc="All PDF templates except Landscape (6in)." options={['Portrait', 'Landscape']} value={settings.pdfOrientation} onChange={(v) => update('pdfOrientation', v)} />
                <ToggleItem label="Repeat Header" desc="Repeat the PDF header on every page." checked={settings.repeatHeader} onChange={(v) => update('repeatHeader', v)} />
              </div>
            </div>

            {/* Table & Content */}
            <div className="ds-card">
              <div className="ds-card-title">Table & Content</div>
              <div className="ds-grid-2">
                <ToggleItem label="Enable Item Headers" desc="Section titles above line groups on PDFs." locked checked={settings.enableItemHeaders} onChange={(v) => update('enableItemHeaders', v)} />
                <ToggleItem label="Show Full page" desc="Vintage, Evergreen, Compact, or Legend PDFs only." checked={settings.showFullPage} onChange={(v) => update('showFullPage', v)} />
                <ToggleItem label="Show Striped Rows" desc="Stripe rows in the PDF table." checked={settings.showStripedRows} onChange={(v) => update('showStripedRows', v)} />
              </div>
            </div>

            {/* Margins */}
            <div className="ds-card">
              <div className="ds-card-title">Margins</div>
              <div className="ds-grid-4">
                <TextField label="PDF margin top" desc="Top space on the PDF. Try about 50; max 250." value={settings.pdfMarginTop} onChange={(v) => update('pdfMarginTop', v)} />
                <TextField label="PDF margin bottom" desc="Bottom space on the PDF. Try about 50; max 250." value={settings.pdfMarginBottom} onChange={(v) => update('pdfMarginBottom', v)} />
                <TextField label="PDF margin left" desc="Left PDF margin. 10 to 60; default 24." value={settings.pdfMarginLeft} onChange={(v) => update('pdfMarginLeft', v)} />
                <TextField label="PDF margin right" desc="Right PDF margin. 10 to 60; default 24." value={settings.pdfMarginRight} onChange={(v) => update('pdfMarginRight', v)} />
              </div>
            </div>

            {/* Export */}
            <div className="ds-card">
              <div className="ds-card-title">Export</div>
              <div className="ds-grid-2">
                <ToggleItem label="Show Conversion Factor" desc="Show conversion rate on export PDFs." checked={settings.showConversionFactor} onChange={(v) => update('showConversionFactor', v)} />
                <ToggleItem label="Show in INR" desc="Also show INR on export PDFs." checked={settings.showInr} onChange={(v) => update('showInr', v)} />
              </div>
            </div>

            {/* Branding */}
            <div className="ds-card">
              <div className="ds-card-title">Branding</div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 12 }}>Color & Watermark</div>
              <div className="ds-grid-2">
                <div className="ds-field-group">
                  <div className="ds-field-label">PDF accent color (default #3815F7)</div>
                  <div className="ds-setting-desc">Hex color for PDF accents on templates that support tinting.</div>
                  <div className="ds-color-input">
                    <div className="ds-color-swatch" style={{ background: settings.pdfAccentColor }} />
                    <input type="text" value={settings.pdfAccentColor} onChange={(e) => update('pdfAccentColor', e.target.value)} />
                  </div>
                </div>
                <div className="ds-field-group">
                  <div className="ds-field-label">Watermark</div>
                  <div className="ds-setting-desc">PNG or JPEG, 512x512 square. Transparency is handled for you.</div>
                  <input
                    type="text"
                    className="ds-input"
                    value={settings.watermark}
                    onChange={(e) => update('watermark', e.target.value)}
                    placeholder="Watermark text or asset id"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="ds-footer">
          <PermissionGate permission={PERMISSIONS.SETTINGS_UPDATE}>
            <button className="ds-btn ds-btn-primary" onClick={save} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </PermissionGate>
          <button className="ds-btn ds-btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ToggleItem({ label, desc, checked, onChange, locked }) {
  return (
    <div className="ds-setting-item">
      <div className="ds-setting-info">
        <div className="ds-setting-label">
          {label}
          {locked && <Icon name="lock" size={12} className="ds-lock" />}
        </div>
        <div className="ds-setting-desc">{desc}</div>
      </div>
      <label className="ds-switch">
        <input
          type="checkbox"
          checked={!!checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={locked}
        />
        <span className={`ds-slider${checked ? ' on' : ''}${locked ? ' disabled' : ''}`} />
      </label>
    </div>
  );
}

function SelectField({ label, desc, options, locked, narrow, value, onChange }) {
  return (
    <div className="ds-field-group">
      <div className="ds-setting-label">
        {label}
        {locked && <Icon name="lock" size={12} className="ds-lock" />}
      </div>
      <div className="ds-setting-desc">{desc}</div>
      <select
        className="ds-select"
        style={narrow ? { width: 80 } : {}}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={locked}
      >
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function TextField({ label, desc, value, onChange }) {
  return (
    <div className="ds-field-group">
      <div className="ds-field-label"><span className="ds-required">*</span> {label}</div>
      <div className="ds-setting-desc">{desc}</div>
      <input
        type="text"
        className="ds-input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
