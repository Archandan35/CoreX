class SchedulerService {
  constructor() {
    this._tasks = new Map();
    this._counter = 0;
  }

  every(name, intervalMs, callback, immediate = false) {
    this.cancel(name);
    const id = setInterval(callback, intervalMs);
    const task = { id, name, type: 'interval', intervalMs, running: true, createdAt: new Date().toISOString() };
    this._tasks.set(name, task);
    if (immediate) callback();
    return task;
  }

  delay(name, delayMs, callback) {
    this.cancel(name);
    const id = setTimeout(() => { callback(); this._tasks.delete(name); }, delayMs);
    const task = { id, name, type: 'delay', delayMs, running: true, createdAt: new Date().toISOString() };
    this._tasks.set(name, task);
    return task;
  }

  cron(name, cronExpression, callback) {
    const { minute, hour } = this._parseCron(cronExpression);
    const task = {
      id: ++this._counter, name, type: 'cron',
      cronExpression, running: true, createdAt: new Date().toISOString(),
      _minute: minute, _hour: hour,
    };
    this._tasks.set(name, task);
    const check = () => {
      if (!task.running) return;
      const now = new Date();
      const matchesMinute = minute === '*' || minute === now.getMinutes();
      const matchesHour = hour === '*' || hour === now.getHours();
      if (matchesMinute && matchesHour) callback();
    };
    task._checkInterval = setInterval(check, 30000);
    return task;
  }

  cancel(name) {
    if (this._tasks.has(name)) {
      const task = this._tasks.get(name);
      if (task.id) clearInterval(task.id);
      if (task._checkInterval) clearInterval(task._checkInterval);
      task.running = false;
      this._tasks.delete(name);
    }
  }

  cancelAll() {
    this._tasks.forEach((_, name) => this.cancel(name));
  }

  getTask(name) { return this._tasks.get(name) || null; }
  getAllTasks() { return Array.from(this._tasks.values()); }

  isRunning(name) {
    return this._tasks.has(name) && this._tasks.get(name).running;
  }

  _parseCron(expression) {
    const parts = expression.trim().split(/\s+/);
    return { minute: parts[0] || '*', hour: parts[1] || '*' };
  }
}

const scheduler = new SchedulerService();
export default scheduler;
