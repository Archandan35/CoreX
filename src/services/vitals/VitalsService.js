export class VitalsService {
  constructor() {
    this.metrics = {};
    this._init();
  }

  _init() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.metrics[entry.entryType || 'unknown'] = entry;
        }
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      observer.observe({ type: 'first-input', buffered: true });
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch {}

    window.addEventListener('load', () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const perf = performance.getEntriesByType('navigation')[0];
          if (perf) {
            this.metrics.ttfb = perf.responseStart - perf.requestStart;
            this.metrics.domContentLoaded = perf.domContentLoadedEventEnd - perf.fetchStart;
            this.metrics.loadTime = perf.loadEventEnd - perf.fetchStart;
          }
        });
      });
    });
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getLCP() {
    return this.metrics['largest-contentful-paint']?.startTime;
  }

  getFID() {
    return this.metrics['first-input']?.processingStart - this.metrics['first-input']?.startTime;
  }

  getCLS() {
    return this.metrics['layout-shift']?.value;
  }

  getTTFB() {
    return this.metrics.ttfb;
  }
}

export const vitalsService = new VitalsService();
