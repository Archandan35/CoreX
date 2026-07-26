const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

export class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.prefix = options.prefix || 'CoreX';
  }

  _log(level, message, meta) {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.level]) return;

    const timestamp = new Date().toISOString();
    const entry = { timestamp, level, prefix: this.prefix, message, meta };

    switch (level) {
      case 'error':
        console.error(JSON.stringify(entry));
        break;
      case 'warn':
        console.warn(JSON.stringify(entry));
        break;
      default:
        console.log(JSON.stringify(entry));
    }
  }

  debug(message, meta) { this._log('debug', message, meta); }
  info(message, meta) { this._log('info', message, meta); }
  warn(message, meta) { this._log('warn', message, meta); }
  error(message, meta) { this._log('error', message, meta); }
}

export const logger = new Logger();
