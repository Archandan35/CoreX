import { themeService } from '../services/theme/ThemeService.js';

class ThemeManager {
  constructor() {
    this._service = themeService;
  }

  get mode() { return this._service.mode; }
  set mode(val) { this._service.mode = val; }
  toggle() { this._service.toggle(); }
  isDark() { return this._service.isDark(); }
  onChange(fn) { return this._service.onChange(fn); }
}

export const themeManager = new ThemeManager();
