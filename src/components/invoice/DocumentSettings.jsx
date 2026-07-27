import { useState } from 'react';
import Icon from '../ui/Icon.jsx';

const QUICK_ACTIONS = [
  { icon: 'heart', title: 'Invoice templates', desc: 'Professional templates for every business need', locked: false },
  { icon: 'gear', title: 'Custom fields', desc: 'Add custom fields in your PDFs', locked: true },
  { icon: 'list', title: 'Prefixes / suffixes', desc: 'Customize invoice serial numbers and sequences', locked: false },
  { icon: 'file-text', title: 'Notes and terms', desc: 'Default footer text, terms, and notes', locked: true },
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
  const [activePill, setActivePill] = useState(0);

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
          <button className="ds-btn ds-btn-primary">Save changes</button>
        </div>

        {/* Body */}
        <div className="ds-body">
          {/* Quick Actions */}
          <div>
            <div className="ds-section-title">Quick actions</div>
            <div className="ds-qa-grid">
              {QUICK_ACTIONS.map((qa) => (
                <div key={qa.title} className="ds-qa-card">
                  <div className="ds-qa-icon"><Icon name={qa.icon} size={16} /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="ds-qa-title">{qa.title}</span>
                    {qa.locked && <Icon name="lock" size={12} className="ds-lock" />}
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
                  className={`ds-pill${i === activePill ? ' active' : ''}`}
                  onClick={() => setActivePill(i)}
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
                <ToggleItem label="Show Images" desc="Show product images on PDFs (up to 10)" defaultOn />
                <ToggleItem label="Show Net Balance" desc="Show what the customer owes (receivable balance)." defaultOn />
                <ToggleItem label="Show Previous Dues" desc="Show the customer's current amount, previous due on the invoice" />
                <ToggleItem label="Show Due Date" desc="Show due date on PDFs." defaultOn />
                <ToggleItem label="Show Dispatch Address" desc="Show dispatch address on PDFs" defaultOn />
                <ToggleItem label="Show Payments" desc="Show how and when they paid on PDFs." defaultOn />
                <ToggleItem label="Show Round Off" desc="Show round-off on PDFs." defaultOn />
                <ToggleItem label="Show Receiver's Signature" desc="Show receiver sign-off on PDFs." />
              </div>
            </div>

            {/* Quantities */}
            <div className="ds-card">
              <div className="ds-card-title">Quantities</div>
              <div className="ds-grid-2">
                <ToggleItem label="Hide Quantity" desc="Hide quantity on PDFs." />
                <ToggleItem label="Show Quantity with 3 decimals" desc="Show qty with three decimals on PDFs." />
                <ToggleItem label="Show Quantity Conversion Rate" desc="Show main unit under the alternate unit" />
              </div>
            </div>

            {/* Pricing & Discounts */}
            <div className="ds-card">
              <div className="ds-card-title">Pricing & Discounts</div>
              <div className="ds-grid-2">
                <ToggleItem label="Hide Discount" desc="Hide line discounts on PDFs." />
                <ToggleItem label="Show Discount Column" desc="Put discount in its own PDF column." />
                <SelectField
                  label="Decimals for item prices on PDFs"
                  desc="Unit and tax-included prices on PDFs. Default: 2, up to 6 decimals."
                  locked
                  options={['2']}
                  narrow
                />
              </div>
            </div>

            {/* Company & HSN/SAC */}
            <div className="ds-card">
              <div className="ds-card-title">Company & HSN/SAC</div>
              <div className="ds-grid-2">
                <ToggleItem label="Hide HSN/SAC" desc="Hide HSN/SAC on PDFs." />
                <ToggleItem label="Show Company Details" desc="Off hides your company block on PDFs (for printed letterhead)." defaultOn locked />
                <ToggleItem label="Show HSN/SAC Summary" desc="HSN/SAC summary on PDFs." locked />
                <SelectField
                  label="Show HSN/SAC Summary on"
                  desc="Choose which document types display the HSN/SAC summary table in PDFs."
                  options={['+10...']}
                />
              </div>
            </div>

            {/* Layout & Fonts */}
            <div className="ds-card">
              <div className="ds-card-title">Layout & Fonts</div>
              <div className="ds-grid-2">
                <SelectField label="Select Language in PDF" desc="Uses this language in PDFs when you type text in that language." options={['English (Default)']} />
                <SelectField label="Select Font Style in PDF" desc="English PDFs only." options={['Stylish']} />
              </div>
              <div className="ds-field-group" style={{ marginTop: 16 }}>
                <div className="ds-field-label">PDF font size</div>
                <div className="ds-setting-desc" style={{ marginBottom: 6 }}>All PDFs.</div>
                <div className="ds-radio-group">
                  <label className="ds-radio"><input type="radio" name="fontSize" /> Small</label>
                  <label className="ds-radio"><input type="radio" name="fontSize" defaultChecked /> Normal</label>
                  <label className="ds-radio"><input type="radio" name="fontSize" /> Large</label>
                </div>
              </div>
            </div>

            {/* Page Setup */}
            <div className="ds-card">
              <div className="ds-card-title">Page Setup</div>
              <div className="ds-grid-2">
                <SelectField label="PDF Orientation" desc="All PDF templates except Landscape (6in)." options={['Portrait']} />
                <ToggleItem label="Repeat Header" desc="Repeat the PDF header on every page." />
              </div>
            </div>

            {/* Table & Content */}
            <div className="ds-card">
              <div className="ds-card-title">Table & Content</div>
              <div className="ds-grid-2">
                <ToggleItem label="Enable Item Headers" desc="Section titles above line groups on PDFs." locked />
                <ToggleItem label="Show Full page" desc="Vintage, Evergreen, Compact, or Legend PDFs only." />
                <ToggleItem label="Show Striped Rows" desc="Stripe rows in the PDF table." />
              </div>
            </div>

            {/* Margins */}
            <div className="ds-card">
              <div className="ds-card-title">Margins</div>
              <div className="ds-grid-4">
                <TextField label="PDF margin top" desc="Top space on the PDF. Try about 50; max 250." value="0" />
                <TextField label="PDF margin bottom" desc="Bottom space on the PDF. Try about 50; max 250." value="0" />
                <TextField label="PDF margin left" desc="Left PDF margin. 10 to 60; default 24." value="24" />
                <TextField label="PDF margin right" desc="Right PDF margin. 10 to 60; default 24." value="24" />
              </div>
            </div>

            {/* Export */}
            <div className="ds-card">
              <div className="ds-card-title">Export</div>
              <div className="ds-grid-2">
                <ToggleItem label="Show Conversion Factor" desc="Show conversion rate on export PDFs." />
                <ToggleItem label="Show in INR" desc="Also show INR on export PDFs." />
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
                    <div className="ds-color-swatch" />
                    <input type="text" defaultValue="#3815f7e6" />
                  </div>
                </div>
                <div className="ds-field-group">
                  <div className="ds-field-label">Watermark</div>
                  <div className="ds-setting-desc">PNG or JPEG, 512x512 square. Transparency is handled for you.</div>
                  <div className="ds-watermark">swipe</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="ds-footer">
          <button className="ds-btn ds-btn-primary">Save changes</button>
          <button className="ds-btn ds-btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ToggleItem({ label, desc, defaultOn, locked }) {
  return (
    <div className="ds-setting-item">
      <div className="ds-setting-info">
        <div className="ds-setting-label">
          {label}
          {locked && <Icon name="lock" size={12} className="ds-lock" />}
        </div>
        <div className="ds-setting-desc">{desc}</div>
      </div>
      <label className="ds-switch"><input type="checkbox" defaultChecked={defaultOn} /><span className="ds-slider" /></label>
    </div>
  );
}

function SelectField({ label, desc, options, locked, narrow }) {
  return (
    <div className="ds-field-group">
      <div className="ds-setting-label">
        {label}
        {locked && <Icon name="lock" size={12} className="ds-lock" />}
      </div>
      <div className="ds-setting-desc">{desc}</div>
      <select className="ds-select" style={narrow ? { width: 80 } : {}}>
        {options.map((opt) => <option key={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function TextField({ label, desc, value }) {
  return (
    <div className="ds-field-group">
      <div className="ds-field-label"><span className="ds-required">*</span> {label}</div>
      <div className="ds-setting-desc">{desc}</div>
      <input type="text" className="ds-input" defaultValue={value} />
    </div>
  );
}