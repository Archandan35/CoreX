export class MonitoringService {
  constructor() {
    this.metrics = new Map();
  }

  increment(name, value = 1) {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + value);
  }

  gauge(name, value) {
    this.metrics.set(name, value);
  }

  timing(name, durationMs) {
    const entries = this.metrics.get(name) || [];
    entries.push(durationMs);
    if (entries.length > 1000) entries.shift();
    this.metrics.set(name, entries);
  }

  getMetric(name) {
    return this.metrics.get(name);
  }

  getAllMetrics() {
    const result = {};
    for (const [key, value] of this.metrics) {
      if (Array.isArray(value)) {
        const sorted = [...value].sort((a, b) => a - b);
        result[key] = {
          count: value.length,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          avg: value.reduce((a, b) => a + b, 0) / value.length,
          p50: sorted[Math.floor(sorted.length * 0.5)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          p99: sorted[Math.floor(sorted.length * 0.99)],
        };
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  reset() {
    this.metrics.clear();
  }
}

export const monitoringService = new MonitoringService();
