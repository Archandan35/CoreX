class AnalyticsService {
  constructor() {
    this._events = [];
    this._maxEvents = 1000;
  }

  track(event, properties = {}) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      event,
      properties,
      timestamp: new Date().toISOString(),
      url: window.location?.href || '',
      userAgent: navigator?.userAgent || '',
    };
    this._events.push(entry);
    if (this._events.length > this._maxEvents) this._events.shift();
    return entry;
  }

  pageView(pageName, properties = {}) {
    return this.track('page_view', { page: pageName, ...properties });
  }

  action(actionName, properties = {}) {
    return this.track('user_action', { action: actionName, ...properties });
  }

  error(error, properties = {}) {
    return this.track('error', { message: error?.message || String(error), stack: error?.stack, ...properties });
  }

  getEvents(filters = {}) {
    let events = [...this._events];
    if (filters.event) events = events.filter(e => e.event === filters.event);
    if (filters.since) events = events.filter(e => new Date(e.timestamp) >= new Date(filters.since));
    if (filters.limit) events = events.slice(-filters.limit);
    return events;
  }

  getSummary() {
    const summary = {};
    this._events.forEach(e => {
      summary[e.event] = (summary[e.event] || 0) + 1;
    });
    return summary;
  }

  clear() { this._events = []; }
}

const analytics = new AnalyticsService();
export default analytics;
