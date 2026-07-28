import { useEffect, useState, useCallback } from 'react';
import { invoiceService } from '../../services/invoice/index.js';
import { Field, Input } from '../ui/Field.jsx';
import Select from '../ui/Select.jsx';
import Checkbox from '../ui/Checkbox.jsx';

const INPUT_TYPE_RENDERERS = {
  text: ({ value, onChange, placeholder, readOnly }) => <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} />,
  number: ({ value, onChange, placeholder, readOnly }) => <Input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} placeholder={placeholder} readOnly={readOnly} />,
  currency: ({ value, onChange, placeholder, readOnly }) => <Input type="number" min="0" step="0.01" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} placeholder={placeholder} readOnly={readOnly} />,
  date: ({ value, onChange, readOnly }) => <Input type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} readOnly={readOnly} />,
  time: ({ value, onChange, readOnly }) => <Input type="time" value={value ?? ''} onChange={(e) => onChange(e.target.value)} readOnly={readOnly} />,
  datetime: ({ value, onChange, readOnly }) => <Input type="datetime-local" value={value ?? ''} onChange={(e) => onChange(e.target.value)} readOnly={readOnly} />,
  email: ({ value, onChange, placeholder, readOnly }) => <Input type="email" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} />,
  phone: ({ value, onChange, placeholder, readOnly }) => <Input type="tel" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} />,
  url: ({ value, onChange, placeholder, readOnly }) => <Input type="url" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} />,
  textarea: ({ value, onChange, placeholder, readOnly }) => (
    <textarea className="ds-textarea" rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly}
      style={{ fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
  ),
  checkbox: ({ value, onChange, label }) => <Checkbox checked={!!value} onChange={(v) => onChange(v)} label={label} />,
  toggle: ({ value, onChange, label }) => (
    <label className="ds-switch" style={{ marginTop: 4 }}>
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      <span className={`ds-slider${value ? ' on' : ''}`} />
    </label>
  ),
};

// Dropdown, multi-select, and radio are rendered in the main component because
// they need the `options` field parsed from the header config.

export default function DynamicCustomHeaders({ values, onChange, docType }) {
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    invoiceService.listCustomHeaders({ active: 'true', pageSize: '200', sortField: 'displayOrder', sortDir: 'asc' })
      .then((data) => {
        const all = data.items || [];
        // Optionally filter by docType match if docTypes field is populated
        setHeaders(all);
      })
      .catch(() => setHeaders([]))
      .finally(() => setLoading(false));
  }, [docType]);

  // Group headers by column position
  const columns = [1, 2, 3, 4].map((colNum) => ({
    colNum,
    headers: headers.filter((h) => {
      const cp = Number(h.columnPosition || h.column || 1);
      return cp === colNum && (h.visible !== false);
    }),
  })).filter((col) => col.headers.length > 0);

  const handleChange = useCallback((header, val) => {
    onChange(header.internalKey, val);
  }, [onChange]);

  if (loading) return null;
  if (headers.length === 0) return null;

  return (
    <section className="inv-card">
      <div className="inv-dynamic-headers">
        <h3>Custom Fields</h3>
        <div className="inv-dynamic-header-grid">
          {columns.map((col) => (
            <div key={col.colNum} className="inv-dynamic-header-col">
              {col.headers.map((header) => (
                <div className="inv-dynamic-header-field" key={header.id || header.internalKey}>
                  <label className="inv-dynamic-header-label">
                    {header.displayName || header.internalKey}
                    {header.required && <span className="inv-required-dot" style={{ color: 'var(--inv-red-dot)', marginLeft: 2 }}>*</span>}
                  </label>
                  <div className="inv-dynamic-header-input">
                    {renderField(header, values[header.internalKey] ?? header.defaultValue ?? '', (val) => handleChange(header, val))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function renderField(header, value, onChange) {
  const type = header.inputType || 'text';
  const placeholder = header.placeholder || '';
  const readOnly = !!header.readOnly;
  const label = header.displayName || header.internalKey;
  const options = header.options ? header.options.split(',').map((s) => s.trim()).filter(Boolean) : [];

  // Standard renderers
  if (INPUT_TYPE_RENDERERS[type]) {
    if (type === 'checkbox') return INPUT_TYPE_RENDERERS.checkbox({ value, onChange, label });
    if (type === 'toggle') return INPUT_TYPE_RENDERERS.toggle({ value, onChange, label });
    return INPUT_TYPE_RENDERERS[type]({ value, onChange, placeholder, readOnly, label });
  }

  // Dropdown
  if (type === 'dropdown') {
    return (
      <select className="form-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={readOnly}
        style={{ width: '100%', fontSize: 13, padding: '6px 10px', border: '1px solid var(--inv-border)', borderRadius: 'var(--inv-radius-sm)', background: '#fff' }}>
        <option value="">{placeholder || 'Select...'}</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }

  // Multi select
  if (type === 'multi_select') {
    const selected = Array.isArray(value) ? value : value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {options.map((opt) => (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={selected.includes(opt)}
              onChange={() => {
                const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
                onChange(next.join(', '));
              }}
              disabled={readOnly}
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  // Radio
  if (type === 'radio') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
            <input type="radio" name={`ch-${header.internalKey}`} checked={value === opt}
              onChange={() => onChange(opt)}
              disabled={readOnly}
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  // Fallback to text
  return <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} />;
}