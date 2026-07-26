const SUBMITTED = new Map();

export function preventDoubleSubmit(key) {
  if (SUBMITTED.has(key)) return false;
  SUBMITTED.set(key, Date.now());
  return true;
}

export function clearSubmitLock(key) {
  SUBMITTED.delete(key);
}

export function isSubmitting(key) {
  return SUBMITTED.has(key);
}

export function withDebounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

export function withThrottle(fn, limit = 300) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}
