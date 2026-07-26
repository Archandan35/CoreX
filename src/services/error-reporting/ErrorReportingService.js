export class ErrorReportingService {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
    this._init();
  }

  _init() {
    if (typeof window === 'undefined') return;
    window.addEventListener('error', (event) => {
      this.capture(event.error || event, { type: 'unhandled', url: window.location.href });
    });
    window.addEventListener('unhandledrejection', (event) => {
      this.capture(event.reason, { type: 'unhandled_promise', url: window.location.href });
    });
  }

  capture(error, metadata = {}) {
    const entry = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      message: error?.message || String(error),
      stack: error?.stack,
      metadata,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
    this.errors.push(entry);
    if (this.errors.length > this.maxErrors) this.errors.shift();
    return entry;
  }

  getErrors() {
    return [...this.errors];
  }

  clear() {
    this.errors = [];
  }

  getStats() {
    const byType = {};
    for (const e of this.errors) {
      const type = e.metadata?.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    }
    return { total: this.errors.length, byType };
  }
}

export const errorReportingService = new ErrorReportingService();
