export class HealthService {
  constructor() {
    this.checks = new Map();
  }

  register(name, checkFn) {
    this.checks.set(name, checkFn);
  }

  async check() {
    const results = {};
    let allHealthy = true;

    for (const [name, checkFn] of this.checks) {
      try {
        const result = await checkFn();
        results[name] = { status: result ? 'healthy' : 'unhealthy', timestamp: new Date().toISOString() };
        if (!result) allHealthy = false;
      } catch (err) {
        results[name] = { status: 'unhealthy', error: err.message, timestamp: new Date().toISOString() };
        allHealthy = false;
      }
    }

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks: results,
      timestamp: new Date().toISOString(),
    };
  }

  async ping() {
    return { alive: true, timestamp: Date.now() };
  }
}

export const healthService = new HealthService();
