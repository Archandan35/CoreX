export class AnalyticsService {
  constructor() {
    this.events = [];
    this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  track(event, properties = {}) {
    const entry = {
      event,
      properties,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
    };
    this.events.push(entry);
    if (this.events.length > 1000) this.events.shift();
    return entry;
  }

  page(name, properties = {}) {
    return this.track('page_view', { page: name, ...properties });
  }

  identify(userId, traits = {}) {
    this.userId = userId;
    this.traits = { ...this.traits, ...traits };
    return this.track('identify', { userId, traits });
  }

  getEvents() {
    return [...this.events];
  }

  clear() {
    this.events = [];
  }

  getStats() {
    const counts = {};
    for (const e of this.events) {
      counts[e.event] = (counts[e.event] || 0) + 1;
    }
    return { total: this.events.length, byEvent: counts };
  }
}

export const analyticsService = new AnalyticsService();
