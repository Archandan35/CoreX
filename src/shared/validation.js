const RULES = {
  required: (v) => (v !== undefined && v !== null && v !== '' ? null : 'This field is required'),
  email: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Invalid email address'),
  min: (n) => (v) => (!v || String(v).length >= n ? null : `Minimum ${n} characters required`),
  max: (n) => (v) => (!v || String(v).length <= n ? null : `Maximum ${n} characters allowed`),
  password: (v) => {
    if (!v) return 'Password is required';
    const errors = [];
    if (!/[A-Z]/.test(v)) errors.push('uppercase letter');
    if (!/[a-z]/.test(v)) errors.push('lowercase letter');
    if (!/[0-9]/.test(v)) errors.push('number');
    if (!/[^A-Za-z0-9]/.test(v)) errors.push('special character');
    if (v.length < 8) errors.push('at least 8 characters');
    if (/(password|123456|qwerty)/i.test(v)) errors.push('not a common password');
    return errors.length ? `Must include ${errors.join(', ')}` : null;
  },
  match: (matchValue, label) => (v) => (v === matchValue ? null : `${label || 'Fields'} do not match`),
  pattern: (regex, msg) => (v) => (!v || regex.test(v) ? null : msg || 'Invalid format'),
  url: (v) => (!v || /^https?:\/\/.+/.test(v) ? null : 'Must be a valid URL'),
  phone: (v) => (!v || /^[\d\s+\-()]{7,20}$/.test(v) ? null : 'Invalid phone number'),
};

export function validateField(value, rules) {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
}

export function validateForm(values, schema) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    const error = validateField(values[field], rules);
    if (error) errors[field] = error;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export default RULES;
