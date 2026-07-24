let counter = 0;
export function uid(prefix = '') {
  return `${prefix}${Date.now().toString(36)}_${(counter++).toString(36)}`;
}

export function nowISO() {
  return new Date().toISOString();
}

export function generateId(prefix = 'id') {
  return uid(prefix);
}

export function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}