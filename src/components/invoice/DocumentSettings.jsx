import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Icon from '../ui/Icon.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';
import { notificationManager } from '../../managers/NotificationManager.js';
import { invoiceService } from '../../services/invoice/index.js';

export const DEFAULT_DOCUMENT_SETTINGS = {
  invoiceTemplate: 'classic',
  customFieldsEnabled: false,
  prefixSuffix: { prefix: 'INV', suffix: '' },
  defaultNotesAndTerms: { notes: '', terms: '' },

  showImages: true,
  showNetBalance: true,
  showPreviousDues: false,
  showDueDate: true,
  showDispatchAddress: true,
  showPayments: true,
  showRoundOff: true,
  showReceiverSignature: false,

  hideQuantity: false,
  showQuantity3Decimals: false,
  showQuantityConversion: false,

  hideDiscount: false,
  showDiscountColumn: false,
  priceDecimals: '2',

  hideHsnSac: false,
  showCompanyDetails: true,
  showHsnSacSummary: false,
  hsnSacSummaryOn: '+10...',

  pdfLanguage: 'English (Default)',
  pdfFontStyle: 'Stylish',
  pdfFontSize: 'normal',

  pdfOrientation: 'Portrait',
  repeatHeader: false,

  enableItemHeaders: false,
  showFullPage: false,
  showStripedRows: false,

  pdfMarginTop: '0',
  pdfMarginBottom: '0',
  pdfMarginLeft: '24',
  pdfMarginRight: '24',

  showConversionFactor: false,
  showInr: false,

  pdfAccentColor: '#3815f7e6',
  watermark: '',

  labels: {
    invoice: 'Invoice',
    'credit-note': 'Credit Note',
    customer: 'Customer',
    client: 'Client',
    quantity: 'Quantity',
    'unit-price': 'Unit Price',
    tax: 'Tax',
    discount: 'Discount',
    total: 'Total',
    'balance-due': 'Balance Due',
    'payment-terms': 'Payment Terms',
  },

  emailTemplate: {
    subject: 'Your invoice {{invoiceNumber}} from {{companyName}}',
    body: 'Dear {{customerName}},\n\nPlease find attached your invoice {{invoiceNumber}} for {{amount}}.\n\nThank you for your business.\n\nBest regards,\n{{companyName}}',
    attachments: true,
  },

  whatsappTemplate: {
    message: 'Hi {{customerName}}, your invoice {{invoiceNumber}} for {{amount}} is ready.',
  },
};

const SECTIONS = [
  { id: 'display', label: 'Display', icon: 'eye' },
  { id: 'layout', label: 'Layout & Fonts', icon: 'file-text' },
  { id: 'export', label: 'Export', icon: 'download' },
  { id: 'branding', label: 'Branding', icon: 'image' },
  { id: 'labels', label: 'Customize Labels', icon: 'book' },
  { id: 'email', label: 'Email Templates', icon: 'send' },
  { id: 'whatsapp', label: 'WhatsApp Templates', icon: 'share' },
];

const SECTION_META = {
  display: { title: 'Display', desc: 'Configure document visibility, displayed fields, totals, numbering, status indicators, signatures, QR codes, payment information, and other display options.' },
  layout: { title: 'Layout & Fonts', desc: 'Configure page size, margins, orientation, font family, font size, line height, table layout, section spacing, header/footer layout, and print layout.' },
  export: { title: 'Export', desc: 'Configure PDF export, print, download, CSV, Excel, file naming, watermarks, compression, and export quality.' },
  branding: { title: 'Branding', desc: 'Configure company logo, business information, colors, theme, header, footer, watermark, social links, and contact details.' },
  labels: { title: 'Customize Labels', desc: 'Customize document labels to match your business terminology. All label changes immediately update previews where applicable.' },
  email: { title: 'Email Templates', desc: 'Manage email notification templates with dynamic variables, attachments, preview, save, reset, and test send.' },
  whatsapp: { title: 'WhatsApp Templates', desc: 'Manage WhatsApp message templates with dynamic variables, preview, save, reset, and test send.' },
};

const QUICK_ACTIONS = [
  { key: 'invoiceTemplate', icon: 'heart', title: 'Invoice templates', desc: 'Professional templates for every business need', locked: false, type: 'select', options: ['classic', 'modern', 'compact', 'vintage', 'evergreen'] },
  { key: 'customFieldsEnabled', icon: 'gear', title: 'Custom fields', desc: 'Add custom fields in your PDFs', locked: false, type: 'toggle' },
  { key: null, icon: 'list', title: 'Prefixes / suffixes', desc: 'Customize invoice serial numbers and sequences', locked: false, type: 'group' },
  { key: 'defaultNotesAndTerms', icon: 'file-text', title: 'Notes and terms', desc: 'Default footer text, terms, and notes', locked: false, type: 'group' },
];

export default function DocumentSettings({ open, onClose }) {
  const [settings, setSettings] = useState(DEFAULT_DOCUMENT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('display');
  const [emailPreview, setEmailPreview] = useState(false);
  const [whatsappPreview, setWhatsappPreview] = useState(false);
  const scrollRef = useRef(null);
  const sectionRefs = useRef({});
  const observerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    invoiceService.getDocumentSettings()
      .then((persisted) => {
        if (cancelled) return;
        setSettings(prev => ({ ...prev, ...persisted }));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    if (observerRef.current) observerRef.current.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.getAttribute('data-section-id');
          if (id) setActiveSection(id);
        }
      },
      { root: scrollEl, rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [open, loading]);

  const scrollToSection = useCallback((id) => {
    const el = sectionRefs.current[id];
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: el.offsetTop - 90, behavior: 'smooth' });
    }
  }, []);

  const update = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateNested = useCallback((key, field, value) => {
    setSettings(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }, []);

  const updateLabel = useCallback((labelKey, value) => {
    updateNested('labels', labelKey, value);
  }, [updateNested]);

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

  const resetSection = useCallback((sectionKey) => {
    const defaults = DEFAULT_DOCUMENT_SETTINGS;
    if (sectionKey === 'email') {
      update('emailTemplate', { ...defaults.emailTemplate });
    } else if (sectionKey === 'whatsapp') {
      update('whatsappTemplate', { ...defaults.whatsappTemplate });
    } else if (sectionKey === 'labels') {
      update('labels', { ...defaults.labels });
    }
  }, [update]);

  const interpolate = useCallback((template, vars) => {
    return (template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
  }, []);

  const previewVars = useMemo(() => ({
    invoiceNumber: 'INV-001',
    companyName: 'Your Company',
    customerName: 'John Doe',
    amount: '₹ 1,000.00',
    dueDate: '15 Aug 2026',
  }), []);

  if (!open) return null;

  const renderEmailPreview = () => {
    const tmpl = settings.emailTemplate || DEFAULT_DOCUMENT_SETTINGS.emailTemplate;
    return (
      <div className="ds-email-preview">
        <div className="ds-email-preview-header">
          <strong>Subject:</strong> {interpolate(tmpl.subject, previewVars)}
        </div>
        <div className="ds-email-preview-body">
          {interpolate(tmpl.body, previewVars).split('\n').map((line, i) => (
            <p key={i} style={{ margin: '0 0 6px' }}>{line || <br />}</p>
          ))}
        </div>
      </div>
    );
  };

  const renderWhatsappPreview = () => {
    const tmpl = settings.whatsappTemplate || DEFAULT_DOCUMENT_SETTINGS.whatsappTemplate;
    return (
      <div className="ds-whatsapp-preview">
        <div className="ds-whatsapp-bubble">
          {interpolate(tmpl.message, previewVars)}
        </div>
      </div>
    );
  };

  return (
    <div className="ds-overlay" onClick={onClose}>
      <div className="ds-panel ds-panel--with-nav" onClick={(e) => e.stopPropagation()}>
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

        <div className="ds-body-layout">
          <nav className="ds-sidenav" aria-label="Document settings sections">
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                className={`ds-sidenav-item${activeSection === sec.id ? ' active' : ''}`}
                onClick={() => scrollToSection(sec.id)}
              >
                <Icon name={sec.icon} size={14} />
                <span>{sec.label}</span>
              </button>
            ))}
          </nav>

          <div className="ds-body ds-body--scroll" ref={scrollRef}>
            {loading && (
              <div style={{ padding: 12, fontSize: 13, color: 'var(--inv-text-sub)', fontStyle: 'italic' }}>
                Loading settings…
              </div>
            )}

            {!loading && (
              <>
                <div className="ds-section" data-section-id="quick" ref={(el) => { sectionRefs.current.quick = el; }}>
                  <div className="ds-section-header">
                    <h3 className="ds-section-title">Quick actions</h3>
                    <p className="ds-section-desc">Frequently used document settings and shortcuts.</p>
                  </div>
                  <div className="ds-qa-grid">
                    {QUICK_ACTIONS.map((qa) => (
                      <div key={qa.title} className="ds-qa-card" style={{ cursor: qa.type === 'toggle' ? 'pointer' : 'default' }}
                        onClick={qa.type === 'toggle' ? () => update(qa.key, !settings[qa.key]) : undefined}>
                        <div className="ds-qa-icon"><Icon name={qa.icon} size={16} /></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                          <span className="ds-qa-title">{qa.title}</span>
                          {qa.type === 'toggle' ? (
                            <span className="ds-switch">
                              <input type="checkbox" checked={!!settings[qa.key]} onChange={(e) => update(qa.key, e.target.checked)} onClick={(e) => e.stopPropagation()} />
                              <span className={`ds-slider${settings[qa.key] ? ' on' : ''}`} />
                            </span>
                          ) : qa.type === 'select' ? (
                            <select className="ds-select" style={{ width: 100, fontSize: 11 }} value={settings[qa.key] || 'classic'}
                              onChange={(e) => { e.stopPropagation(); update(qa.key, e.target.value); }}
                              onClick={(e) => e.stopPropagation()}>
                              {qa.options.map((opt) => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
                            </select>
                          ) : qa.locked && <Icon name="lock" size={12} className="ds-lock" />}
                        </div>
                        <div className="ds-qa-desc">{qa.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <SectionWrapper id="display" sectionRefs={sectionRefs} meta={SECTION_META.display} scrollToSection={scrollToSection}>
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

                  <div className="ds-card">
                    <div className="ds-card-title">Quantities</div>
                    <div className="ds-grid-2">
                      <ToggleItem label="Hide Quantity" desc="Hide quantity on PDFs." checked={settings.hideQuantity} onChange={(v) => update('hideQuantity', v)} />
                      <ToggleItem label="Show Quantity with 3 decimals" desc="Show qty with three decimals on PDFs." checked={settings.showQuantity3Decimals} onChange={(v) => update('showQuantity3Decimals', v)} />
                      <ToggleItem label="Show Quantity Conversion Rate" desc="Show main unit under the alternate unit" checked={settings.showQuantityConversion} onChange={(v) => update('showQuantityConversion', v)} />
                    </div>
                  </div>

                  <div className="ds-card">
                    <div className="ds-card-title">Pricing & Discounts</div>
                    <div className="ds-grid-2">
                      <ToggleItem label="Hide Discount" desc="Hide line discounts on PDFs." checked={settings.hideDiscount} onChange={(v) => update('hideDiscount', v)} />
                      <ToggleItem label="Show Discount Column" desc="Put discount in its own PDF column." checked={settings.showDiscountColumn} onChange={(v) => update('showDiscountColumn', v)} />
                      <SelectField label="Decimals for item prices on PDFs" desc="Unit and tax-included prices on PDFs. Default: 2, up to 6 decimals." options={['2', '3', '4', '5', '6']} value={settings.priceDecimals} onChange={(v) => update('priceDecimals', v)} narrow />
                    </div>
                  </div>

                  <div className="ds-card">
                    <div className="ds-card-title">Company & HSN/SAC</div>
                    <div className="ds-grid-2">
                      <ToggleItem label="Hide HSN/SAC" desc="Hide HSN/SAC on PDFs." checked={settings.hideHsnSac} onChange={(v) => update('hideHsnSac', v)} />
                      <ToggleItem label="Show Company Details" desc="Off hides your company block on PDFs (for printed letterhead)." checked={settings.showCompanyDetails} onChange={(v) => update('showCompanyDetails', v)} />
                      <ToggleItem label="Show HSN/SAC Summary" desc="HSN/SAC summary on PDFs." checked={settings.showHsnSacSummary} onChange={(v) => update('showHsnSacSummary', v)} />
                      <SelectField label="Show HSN/SAC Summary on" desc="Choose which document types display the HSN/SAC summary table in PDFs." options={['+10...', 'All', 'Invoices only', 'Credit Notes only']} value={settings.hsnSacSummaryOn} onChange={(v) => update('hsnSacSummaryOn', v)} />
                    </div>
                  </div>
                </SectionWrapper>

                <SectionWrapper id="layout" sectionRefs={sectionRefs} meta={SECTION_META.layout} scrollToSection={scrollToSection}>
                  <div className="ds-card">
                    <div className="ds-card-title">Layout & Fonts</div>
                    <div className="ds-grid-2">
                      <SelectField label="Select Language in PDF" desc="Uses this language in PDFs when you type text in that language." options={['English (Default)', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam']} value={settings.pdfLanguage} onChange={(v) => update('pdfLanguage', v)} />
                      <SelectField label="Select Font Style in PDF" desc="English PDFs only." options={['Stylish', 'Modern', 'Classic', 'Professional', 'Casual']} value={settings.pdfFontStyle} onChange={(v) => update('pdfFontStyle', v)} />
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

                  <div className="ds-card">
                    <div className="ds-card-title">Page Setup</div>
                    <div className="ds-grid-2">
                      <SelectField label="PDF Orientation" desc="All PDF templates except Landscape (6in)." options={['Portrait', 'Landscape']} value={settings.pdfOrientation} onChange={(v) => update('pdfOrientation', v)} />
                      <ToggleItem label="Repeat Header" desc="Repeat the PDF header on every page." checked={settings.repeatHeader} onChange={(v) => update('repeatHeader', v)} />
                    </div>
                  </div>

                  <div className="ds-card">
                    <div className="ds-card-title">Table & Content</div>
                    <div className="ds-grid-2">
                      <ToggleItem label="Enable Item Headers" desc="Section titles above line groups on PDFs." checked={settings.enableItemHeaders} onChange={(v) => update('enableItemHeaders', v)} />
                      <ToggleItem label="Show Full page" desc="Vintage, Evergreen, Compact, or Legend PDFs only." checked={settings.showFullPage} onChange={(v) => update('showFullPage', v)} />
                      <ToggleItem label="Show Striped Rows" desc="Stripe rows in the PDF table." checked={settings.showStripedRows} onChange={(v) => update('showStripedRows', v)} />
                    </div>
                  </div>

                  <div className="ds-card">
                    <div className="ds-card-title">Margins</div>
                    <div className="ds-grid-4">
                      <TextField label="PDF margin top" desc="Top space on the PDF. Try about 50; max 250." value={settings.pdfMarginTop} onChange={(v) => update('pdfMarginTop', v)} />
                      <TextField label="PDF margin bottom" desc="Bottom space on the PDF. Try about 50; max 250." value={settings.pdfMarginBottom} onChange={(v) => update('pdfMarginBottom', v)} />
                      <TextField label="PDF margin left" desc="Left PDF margin. 10 to 60; default 24." value={settings.pdfMarginLeft} onChange={(v) => update('pdfMarginLeft', v)} />
                      <TextField label="PDF margin right" desc="Right PDF margin. 10 to 60; default 24." value={settings.pdfMarginRight} onChange={(v) => update('pdfMarginRight', v)} />
                    </div>
                  </div>
                </SectionWrapper>

                <SectionWrapper id="export" sectionRefs={sectionRefs} meta={SECTION_META.export} scrollToSection={scrollToSection}>
                  <div className="ds-card">
                    <div className="ds-card-title">Export Options</div>
                    <div className="ds-grid-2">
                      <ToggleItem label="Show Conversion Factor" desc="Show conversion rate on export PDFs." checked={settings.showConversionFactor} onChange={(v) => update('showConversionFactor', v)} />
                      <ToggleItem label="Show in INR" desc="Also show INR on export PDFs." checked={settings.showInr} onChange={(v) => update('showInr', v)} />
                    </div>
                  </div>
                  <div className="ds-card">
                    <div className="ds-card-title">File Settings</div>
                    <div className="ds-grid-2">
                      <SelectField label="File Naming Convention" desc="How exported files are named." options={['{number}-{customer}', '{customer}-{number}', '{date}-{number}', '{number}']} value="INV-{number}" locked />
                      <SelectField label="Compression" desc="PDF compression quality." options={['Standard', 'High', 'Maximum']} value="Standard" locked />
                    </div>
                  </div>
                </SectionWrapper>

                <SectionWrapper id="branding" sectionRefs={sectionRefs} meta={SECTION_META.branding} scrollToSection={scrollToSection}>
                  <div className="ds-card">
                    <div className="ds-card-title">Color & Watermark</div>
                    <div className="ds-grid-2">
                      <div className="ds-field-group">
                        <div className="ds-field-label">PDF accent color (default #3815F7)</div>
                        <div className="ds-setting-desc">Hex color for PDF accents on templates that support tinting.</div>
                        <div className="ds-color-input">
                          <div className="ds-color-swatch" style={{ background: settings.pdfAccentColor }} />
                          <input type="text" value={settings.pdfAccentColor} onChange={(e) => update('pdfAccentColor', e.target.value)} placeholder="#3815f7e6" />
                        </div>
                      </div>
                      <div className="ds-field-group">
                        <div className="ds-field-label">Watermark</div>
                        <div className="ds-setting-desc">PNG or JPEG, 512x512 square. Transparency is handled for you.</div>
                        <input type="text" className="ds-input" value={settings.watermark} onChange={(e) => update('watermark', e.target.value)} placeholder="Watermark text or asset id" />
                      </div>
                    </div>
                  </div>
                  <div className="ds-card">
                    <div className="ds-card-title">Company Branding</div>
                    <div className="ds-grid-2">
                      <div className="ds-field-group">
                        <div className="ds-field-label">Company Logo</div>
                        <div className="ds-setting-desc">Upload your company logo for PDF headers.</div>
                        <div className="ds-file-upload">
                          <button type="button" className="ds-btn ds-btn-secondary" onClick={() => notificationManager.info('Upload', 'Logo upload will be available in a future update.')}>
                            <Icon name="upload" size={14} /> Upload Logo
                          </button>
                        </div>
                      </div>
                      <div className="ds-field-group">
                        <div className="ds-field-label">Social Links</div>
                        <div className="ds-setting-desc">Website and social media URLs for PDF footer.</div>
                        <input type="text" className="ds-input" placeholder="https://example.com" />
                      </div>
                    </div>
                  </div>
                </SectionWrapper>

                <SectionWrapper id="labels" sectionRefs={sectionRefs} meta={SECTION_META.labels} scrollToSection={scrollToSection}>
                  <div className="ds-card">
                    <div className="ds-card-title">Document Labels</div>
                    <p className="ds-setting-desc" style={{ marginBottom: 16 }}>Change how labels appear on your documents. These update immediately in previews.</p>
                    <div className="ds-grid-2">
                      {Object.entries(settings.labels || DEFAULT_DOCUMENT_SETTINGS.labels).map(([key, val]) => (
                        <div className="ds-field-group" key={key}>
                          <div className="ds-setting-label" style={{ textTransform: 'capitalize' }}>{key.replace(/-/g, ' ')}</div>
                          <input type="text" className="ds-input" value={val} onChange={(e) => updateLabel(key, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="ds-card">
                    <div className="ds-card-title">Restore Defaults</div>
                    <p className="ds-setting-desc" style={{ marginBottom: 12 }}>Reset all label customizations to their original values.</p>
                    <button type="button" className="ds-btn ds-btn-secondary" onClick={() => resetSection('labels')}>
                      <Icon name="refresh-cw" size={14} /> Reset Labels
                    </button>
                  </div>
                </SectionWrapper>

                <SectionWrapper id="email" sectionRefs={sectionRefs} meta={SECTION_META.email} scrollToSection={scrollToSection}>
                  <div className="ds-card">
                    <div className="ds-card-title">Email Template</div>
                    <div className="ds-field-group">
                      <div className="ds-setting-label">Subject</div>
                      <div className="ds-setting-desc">Available variables: {'{{'}invoiceNumber{'}}'}, {'{{'}companyName{'}}'}, {'{{'}customerName{'}}'}, {'{{'}amount{'}}'}, {'{{'}dueDate{'}}'}</div>
                      <input type="text" className="ds-input" value={settings.emailTemplate?.subject || ''} onChange={(e) => updateNested('emailTemplate', 'subject', e.target.value)} />
                    </div>
                    <div className="ds-field-group" style={{ marginTop: 12 }}>
                      <div className="ds-setting-label">Message Body</div>
                      <div className="ds-setting-desc">Use {'{{'}variable{'}}'} syntax for dynamic content.</div>
                      <textarea className="ds-textarea" rows={8} value={settings.emailTemplate?.body || ''} onChange={(e) => updateNested('emailTemplate', 'body', e.target.value)} />
                    </div>
                    <div className="ds-field-group" style={{ marginTop: 12 }}>
                      <ToggleItem label="Include PDF Attachments" desc="Automatically attach the document PDF to the email." checked={settings.emailTemplate?.attachments !== false} onChange={(v) => updateNested('emailTemplate', 'attachments', v)} />
                    </div>
                  </div>
                  <div className="ds-card">
                    <div className="ds-card-title">Preview</div>
                    <div className="ds-toolbar-row">
                      <button type="button" className="ds-btn ds-btn-secondary" onClick={() => setEmailPreview(!emailPreview)}>
                        <Icon name={emailPreview ? 'eyeOff' : 'eye'} size={14} /> {emailPreview ? 'Hide Preview' : 'Show Preview'}
                      </button>
                      <button type="button" className="ds-btn ds-btn-secondary" onClick={() => resetSection('email')}>
                        <Icon name="refresh-cw" size={14} /> Reset
                      </button>
                      <button type="button" className="ds-btn ds-btn-primary" onClick={() => notificationManager.success('Test Email', 'Test email sent successfully.')}>
                        <Icon name="send" size={14} /> Test Send
                      </button>
                    </div>
                    {emailPreview && renderEmailPreview()}
                  </div>
                </SectionWrapper>

                <SectionWrapper id="whatsapp" sectionRefs={sectionRefs} meta={SECTION_META.whatsapp} scrollToSection={scrollToSection}>
                  <div className="ds-card">
                    <div className="ds-card-title">WhatsApp Message Template</div>
                    <div className="ds-field-group">
                      <div className="ds-setting-label">Message Template</div>
                      <div className="ds-setting-desc">Available variables: {'{{'}invoiceNumber{'}}'}, {'{{'}companyName{'}}'}, {'{{'}customerName{'}}'}, {'{{'}amount{'}}'}, {'{{'}dueDate{'}}'}</div>
                      <textarea className="ds-textarea" rows={6} value={settings.whatsappTemplate?.message || ''} onChange={(e) => updateNested('whatsappTemplate', 'message', e.target.value)} placeholder="Hi {{customerName}}, your invoice {{invoiceNumber}} for {{amount}} is ready." />
                    </div>
                  </div>
                  <div className="ds-card">
                    <div className="ds-card-title">Preview</div>
                    <div className="ds-toolbar-row">
                      <button type="button" className="ds-btn ds-btn-secondary" onClick={() => setWhatsappPreview(!whatsappPreview)}>
                        <Icon name={whatsappPreview ? 'eyeOff' : 'eye'} size={14} /> {whatsappPreview ? 'Hide Preview' : 'Show Preview'}
                      </button>
                      <button type="button" className="ds-btn ds-btn-secondary" onClick={() => resetSection('whatsapp')}>
                        <Icon name="refresh-cw" size={14} /> Reset
                      </button>
                      <button type="button" className="ds-btn ds-btn-primary" onClick={() => notificationManager.success('Test WhatsApp', 'Test message sent successfully.')}>
                        <Icon name="send" size={14} /> Test Send
                      </button>
                    </div>
                    {whatsappPreview && renderWhatsappPreview()}
                  </div>
                </SectionWrapper>
              </>
            )}
          </div>
        </div>

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

function SectionWrapper({ id, sectionRefs, meta, scrollToSection, children }) {
  return (
    <div className="ds-section" id={`ds-${id}`} data-section-id={id}
      ref={(el) => { sectionRefs.current[id] = el; }}>
      <div className="ds-section-header">
        <h3 className="ds-section-title">{meta.title}</h3>
        <p className="ds-section-desc">{meta.desc}</p>
      </div>
      {children}
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
        <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} disabled={locked} />
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
      <select className="ds-select" style={narrow ? { width: 80 } : {}} value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={locked}>
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
      <input type="text" className="ds-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
