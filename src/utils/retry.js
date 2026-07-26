export async function withRetry(fn, options = {}) {
  const maxAttempts = options.maxAttempts || 3;
  const baseDelay = options.baseDelay || 500;
  const maxDelay = options.maxDelay || 8000;
  const onRetry = options.onRetry || null;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        if (onRetry) onRetry({ attempt, error, delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export function withRetrySync(fn, options = {}) {
  const maxAttempts = options.maxAttempts || 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) break;
    }
  }

  throw lastError;
}
