export { withRetry, withRetrySync } from './retry.js';
export { sanitize, sanitizeObject, stripHtml, escapeHtml } from './xss.js';
export { preventDoubleSubmit, clearSubmitLock, isSubmitting, withDebounce, withThrottle } from './submission.js';

export function classNames(...args) {
  return args.filter(Boolean).join(' ');
}

export function truncate(str, len = 100) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString();
}

export function formatDateTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleString();
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateKey() {
  return Math.random().toString(36).substring(2, 10);
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function pick(obj, keys) {
  const result = {};
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

export function omit(obj, keys) {
  const result = { ...obj };
  for (const key of keys) delete result[key];
  return result;
}

export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
