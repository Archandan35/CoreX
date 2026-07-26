import { STORAGE_KEYS } from '../../constants/index.js';

export class ThemeService {
  constructor() {
    this._mode = this._load() || 'system';
    this._observers = new Set();
    this._apply();
  }

  get mode() { return this._mode; }

  set mode(val) {
    this._mode = val;
    this._save();
    this._apply();
    this._notify();
  }

  toggle() {
    this.mode = this._mode === 'light' ? 'dark' : 'light';
  }

  isDark() {
    if (this._mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return this._mode === 'dark';
  }

  onChange(fn) {
    this._observers.add(fn);
    return () => this._observers.delete(fn);
  }

  _apply() {
    document.documentElement.setAttribute('data-theme', this.isDark() ? 'dark' : 'light');
  }

  _load() {
    try {
      return localStorage.getItem(STORAGE_KEYS.THEME);
    } catch { return null; }
  }

  _save() {
    try { localStorage.setItem(STORAGE_KEYS.THEME, this._mode); } catch {}
  }

  _notify() {
    this._observers.forEach((fn) => fn(this._mode));
  }
}

export const themeService = new ThemeService();