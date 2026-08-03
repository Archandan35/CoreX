import { useEffect, useState, useCallback, useRef } from 'react';
import { invoiceService } from '../../services/invoice/index.js';
import { Input } from '../ui/Field.jsx';
import Checkbox from '../ui/Checkbox.jsx';
import Icon from '../ui/Icon.jsx';
import Button from '../ui/Button.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import { PERMISSIONS } from '../../identity/rbac/permissions.js';

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
  toggle: ({ value, onChange, _label }) => (
    <label className="ds-switch" style={{ marginTop: 4 }}>
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      <span className={`ds-slider${value ? ' on' : ''}`} />
    </label>
  ),
};

export default function DynamicCustomHeaders({ values, onChange, docType, chipMode, onOpenSettings, expandedKeys: controlledExpanded, onExpandedChange, errors, onHeadersLoaded, refreshKey }) {
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [internalExpanded, setInternalExpanded] = useState(new Set());
  const seededExpanded = useRef(false);

  const expanded = controlledExpanded || internalExpanded;
  const setExpanded = onExpandedChange || setInternalExpanded;

  useEffect(() => {
    setLoading(true);
    seededExpanded.current = false;
    const params = { active: 'true', pageSize: '200', sortField: 'displayOrder', sortDir: 'asc' };
    if (docType) params.docType = docType;
    invoiceService.listCustomHeaders(params)
      .then((data) => {
        const all = data.items || [];
        setHeaders(all);
        if (onHeadersLoaded) onHeadersLoaded(all);
      })
      .catch(() => setHeaders([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docType, refreshKey]);

  // Seed expanded set from existing values once when headers load (edit mode)
  useEffect(() => {
    if (!chipMode || loading || seededExpanded.current) return;
    if (!values || typeof values !== 'object') return;
    const savedKeys = Object.keys(values).filter((k) => values[k] !== '' && values[k] != null);
    if (savedKeys.length === 0) return;
    seededExpanded.current = true;
    setExpanded((prev) => {
      const next = new Set(prev);
      savedKeys.forEach((k) => next.add(k));
      return next;
    });
  }, [chipMode, loading, values, setExpanded]);

  const handleChange = useCallback((header, val) => {
    onChange(header.internalKey, val);
  }, [onChange]);

  const toggleHeader = useCallback((header) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(header.internalKey)) next.delete(header.internalKey);
      else next.add(header.internalKey);
      return next;
    });
  }, [setExpanded]);

  // Filter headers: visible, active, and matching docType
  const visibleHeaders = headers.filter((h) => {
    if (h.visible === false) return false;
    if (h.active === false) return false;
    if (docType && h.docTypes && h.docTypes.length > 0 && !h.docTypes.includes(docType)) return false;
    return true;
  });

  if (loading) return null;

  if (visibleHeaders.length === 0) {
    if (chipMode) {
      return (
        <section className="inv-card">
          <div className="inv-custom-headers">
            <h3>Custom Headers</h3>
            <div className="inv-ch-empty">
              <p>No custom headers have been configured.</p>
              <p className="inv-ch-empty-sub">Create custom headers from: Document Settings → Custom Headers.</p>
              <PermissionGate permission={PERMISSIONS.SETTINGS_UPDATE}>
                <Button variant="secondary" size="small" icon="gear" onClick={onOpenSettings}>Configure Custom Headers</Button>
              </PermissionGate>
            </div>
          </div>
        </section>
      );
    }
    return null;
  }

  // Split headers into expanded and collapsed
  const expandedList = visibleHeaders.filter((h) => expanded.has(h.internalKey));
  const collapsedList = visibleHeaders.filter((h) => !expanded.has(h.internalKey));

  // Group headers by column position
  const groupByColumn = (headers) => [1, 2, 3, 4].map((colNum) => ({
    colNum,
    headers: headers.filter((h) => {
      const cp = Number(h.columnPosition || h.column || 1);
      return cp === colNum;
    }),
  })).filter((col) => col.headers.length > 0);

  // In non-chip mode, show ALL visible headers
  const allColumns = groupByColumn(visibleHeaders);
  // In chip mode, show only expanded headers
  const expandedColumns = groupByColumn(expandedList);

  const gridColumns = chipMode ? expandedColumns : allColumns;

  return (
    <section className="inv-card">
      <div className="inv-custom-headers">
        <h3>Custom Headers</h3>

        {/* Header fields in column grid */}
        {gridColumns.length > 0 && (
          <div className="inv-ch-grid inv-ch-grid--cols">
            {gridColumns.map((col) => (
              <div key={col.colNum} className="inv-ch-col">
                {col.headers.map((header) => (
                    <div className="inv-ch-field" key={header.id || header.internalKey}>
                      <div className="inv-ch-field-head">
                        <label className="inv-ch-field-label">
                          {header.displayName || header.internalKey}
                          {header.required && <span className="inv-required-dot">*</span>}
                        </label>
                        {chipMode && (
                          <button type="button" className="inv-ch-remove-btn" onClick={() => toggleHeader(header)} aria-label={`Remove ${header.displayName || header.internalKey}`}>
                            <Icon name="x" size={12} />
                          </button>
                        )}
                      </div>
                      <div className="inv-ch-field-input">
                        {renderField(header, values[header.internalKey] ?? header.defaultValue ?? '', (val) => handleChange(header, val))}
                      </div>
                      {errors?.[header.internalKey] && (
                        <span className="inv-field-error">{errors[header.internalKey]}</span>
                      )}
                    </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Collapsed header chips */}
        {chipMode && collapsedList.length > 0 && (
          <div className="inv-chip-row" style={{ marginTop: gridColumns.length > 0 ? 12 : 0 }}>
            {collapsedList.map((header) => (
              <button
                type="button"
                className="inv-chip"
                key={header.id || header.internalKey}
                onClick={() => toggleHeader(header)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHeader(header); } }}
                aria-label={`Add ${header.displayName || header.internalKey}`}
              >
                <Icon name="plus" size={12} /> {header.displayName || header.internalKey}
              </button>
            ))}
          </div>
        )}
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

  if (INPUT_TYPE_RENDERERS[type]) {
    if (type === 'checkbox') return INPUT_TYPE_RENDERERS.checkbox({ value, onChange, label });
    if (type === 'toggle') return INPUT_TYPE_RENDERERS.toggle({ value, onChange, label });
    return INPUT_TYPE_RENDERERS[type]({ value, onChange, placeholder, readOnly, label });
  }

  if (type === 'dropdown') {
    return (
      <select className="form-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={readOnly}
        style={{ width: '100%', fontSize: 13, padding: '6px 10px', border: '1px solid var(--inv-border)', borderRadius: 'var(--inv-radius-sm)', background: '#fff' }}>
        <option value="">{placeholder || 'Select...'}</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }

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

  return <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} />;
}