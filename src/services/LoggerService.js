const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, FATAL: 4 };

class LoggerService {
  constructor() {
    this._level = LEVELS.INFO;
    this._handlers = [];
    this._history = [];
    this._maxHistory = 500;
  }

  setLevel(level) { this._level = LEVELS[level] ?? LEVELS.INFO; }

  addHandler(handler) { this._handlers.push(handler); }

  _log(level, message, data) {
    if (LEVELS[level] < this._level) return;
    const entry = { timestamp: new Date().toISOString(), level, message, data };
    this._history.push(entry);
    if (this._history.length > this._maxHistory) this._history.shift();
    const consoleFn = level === 'ERROR' || level === 'FATAL' ? 'error' : level === 'WARN' ? 'warn' : 'log';
    console[consoleFn](`[${level}] ${message}`, data || '');
    this._handlers.forEach(h => h(entry));
  }

  debug(message, data) { this._log('DEBUG', message, data); }
  info(message, data) { this._log('INFO', message, data); }
  warn(message, data) { this._log('WARN', message, data); }
  error(message, data) { this._log('ERROR', message, data); }
  fatal(message, data) { this._log('FATAL', message, data); }

  getHistory() { return [...this._history]; }
  clearHistory() { this._history = []; }
}

const logger = new LoggerService();
export default logger;
