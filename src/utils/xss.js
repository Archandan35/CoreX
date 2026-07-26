export function sanitize(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;');
}

export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    const safeKey = sanitize(key);
    if (typeof value === 'string') {
      result[safeKey] = sanitize(value);
    } else if (typeof value === 'object' && value !== null) {
      result[safeKey] = sanitizeObject(value);
    } else {
      result[safeKey] = value;
    }
  }
  return result;
}

export function stripHtml(input) {
  if (typeof input !== 'string') return input;
  return input.replace(/<[^>]*>/g, '');
}

export function escapeHtml(input) {
  return sanitize(input);
}
