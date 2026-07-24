export function serialize(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = serialize(val);
    }
    return result;
  }
  return value;
}

export function deserialize(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  if (Array.isArray(value)) return value.map(deserialize);
  if (typeof value === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = deserialize(val);
    }
    return result;
  }
  return value;
}

export function normalize(value) {
  if (typeof value !== 'string') return value;
  return value.normalize('NFKC').trim();
}

export function denormalize(value) {
  return value;
}

export function toPlainObject(value) {
  return JSON.parse(JSON.stringify(value));
}
