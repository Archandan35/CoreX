import React from 'react';
import I from '../icon';

export function Input({ label, required, error, hint, className = '', ...props }) {
  return (
    <div className="form-group">
      {label && <label className={`form-label ${required ? 'form-label-required' : ''}`}>{label}</label>}
      <input className={`form-input ${error ? 'form-input-error' : ''} ${className}`} {...props} />
      {error && <div className="form-error">{error}</div>}
      {hint && !error && <div className="form-hint">{hint}</div>}
    </div>
  );
}

export function Select({ label, required, error, hint, options = [], placeholder, className = '', ...props }) {
  return (
    <div className="form-group">
      {label && <label className={`form-label ${required ? 'form-label-required' : ''}`}>{label}</label>}
      <select className={`form-select ${error ? 'form-input-error' : ''} ${className}`} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <div className="form-error">{error}</div>}
      {hint && !error && <div className="form-hint">{hint}</div>}
    </div>
  );
}

export function Textarea({ label, required, error, hint, className = '', ...props }) {
  return (
    <div className="form-group">
      {label && <label className={`form-label ${required ? 'form-label-required' : ''}`}>{label}</label>}
      <textarea className={`form-textarea ${error ? 'form-input-error' : ''} ${className}`} {...props} />
      {error && <div className="form-error">{error}</div>}
      {hint && !error && <div className="form-hint">{hint}</div>}
    </div>
  );
}

export const Checkbox = React.forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className={`form-checkbox ${className}`}>
      <input type="checkbox" ref={ref} {...props} />
      {label && <label>{label}</label>}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
});

export function Radio({ label, name, value, checked, onChange, className = '' }) {
  return (
    <div className={`form-radio ${className}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
      {label && <label>{label}</label>}
    </div>
  );
}

export function Switch({ label, checked, onChange, disabled, className = '' }) {
  return (
    <label className={`form-switch ${className}`}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      <div className="form-switch-track">
        <div className="form-switch-thumb" />
      </div>
      {label && <span>{label}</span>}
    </label>
  );
}

export function PasswordInput({ label, required, error, hint, value, onChange, className = '', ...props }) {
  const checks = [];
  if (value) {
    const addCheck = (cond, text, validClass) => {
      const key = text.replace(/[^a-zA-Z0-9]/g, '');
      checks.push(<span key={key} className={`checklist-item ${cond ? 'valid' : ''}`}>{cond ? '✓' : '○'} {text}</span>);
    };
    addCheck(/[A-Z]/.test(value), 'Uppercase');
    addCheck(/[a-z]/.test(value), 'Lowercase');
    addCheck(/[0-9]/.test(value), 'Number');
    addCheck(/[^A-Za-z0-9]/.test(value), 'Special');
    addCheck(value.length >= 8, '8+ chars');
    addCheck(!/(password|123456|qwerty)/i.test(value), 'Not common');
  }

  return (
    <div className="form-group">
      {label && <label className={`form-label ${required ? 'form-label-required' : ''}`}>{label}</label>}
      <div className="pos-relative">
        <input type="password" className={`form-input ${error ? 'form-input-error' : ''} ${className}`} value={value} onChange={onChange} {...props} />
      </div>
      {checks.length > 0 && <div className="checklist">{checks}</div>}
      {error && <div className="form-error">{error}</div>}
      {hint && !error && <div className="form-hint">{hint}</div>}
    </div>
  );
}
