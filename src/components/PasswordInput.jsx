import { useState } from 'react';
import Icon from './Icon';

const DEFAULT_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'At least 1 uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'At least 1 lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'At least 1 number', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'At least 1 special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(password, rules) {
  if (!password) return 0;
  return rules.filter((r) => r.test(password)).length;
}

const PasswordInput = ({ value, onChange, placeholder, className = '', showStrength = true }) => {
  const [showPassword, setShowPassword] = useState(false);
  const rules = DEFAULT_RULES;
  const passed = getStrength(value, rules);
  const total = rules.length;
  const pct = total ? Math.round((passed / total) * 100) : 0;
  const barColor = pct <= 40 ? 'var(--danger)' : pct < 80 ? 'var(--warning)' : 'var(--success)';

  return (
    <div className="password-field">
      <div className="password-input-wrapper">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`form-input ${className}`.trim()}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} />
        </button>
      </div>

      {showStrength && value && (
        <div className="pw-strength">
          <div className="pw-strength__bar-track">
            <div className="pw-strength__bar-fill" style={{ width: `${pct}%`, background: barColor }} />
          </div>
          <div className="pw-strength__rules">
            {rules.map((r) => {
              const ok = r.test(value);
              return (
                <div key={r.id} className={`pw-rule ${ok ? 'pw-rule--pass' : ''}`}>
                  <Icon name={ok ? 'check' : 'x'} size={12} />
                  <span>{r.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordInput;
