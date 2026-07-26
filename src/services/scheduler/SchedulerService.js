export class SchedulerService {
  constructor() {
    this.tasks = new Map();
    this.timers = new Map();
  }

  every(interval, name, handler) {
    const id = setInterval(handler, interval);
    this.tasks.set(name, { type: 'interval', interval, handler });
    this.timers.set(name, id);
    return id;
  }

  delay(ms, name, handler) {
    const id = setTimeout(() => {
      handler();
      this.timers.delete(name);
    }, ms);
    this.tasks.set(name, { type: 'delay', ms, handler });
    this.timers.set(name, id);
    return id;
  }

  cron(schedule, name, handler) {
    const ms = this._parseCron(schedule);
    return this.every(ms, name, handler);
  }

  cancel(name) {
    const id = this.timers.get(name);
    if (id) {
      clearInterval(id);
      clearTimeout(id);
      this.timers.delete(name);
      this.tasks.delete(name);
    }
  }

  cancelAll() {
    for (const name of this.timers.keys()) this.cancel(name);
  }

  list() {
    return Array.from(this.tasks.keys());
  }

  _parseCron(schedule) {
    const parts = schedule.split(' ');
    if (parts.length < 5) return 60000;
    if (parts[1] === '*') return 60000;
    return parseInt(parts[1], 10) * 60000;
  }
}

export const schedulerService = new SchedulerService();
