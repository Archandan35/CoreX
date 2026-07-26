import { STORAGE_KEYS } from '../../constants/index.js';

const TRANSLATIONS = {
  en: {
    common: { save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', create: 'Create', search: 'Search', loading: 'Loading...', noData: 'No data found' },
    auth: { signIn: 'Sign in', signOut: 'Sign out', register: 'Create account', email: 'Email', password: 'Password' },
    users: { title: 'Users', addUser: 'Add User', editUser: 'Edit User', deleteUser: 'Delete User' },
    roles: { title: 'Roles', addRole: 'Add Role', editRole: 'Edit Role', deleteRole: 'Delete Role' },
    settings: { title: 'Settings', saved: 'Settings saved.' },
    dashboard: { title: 'Dashboard', totalUsers: 'Total Users', activeRoles: 'Active Roles' },
  },
  es: {
    common: { save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar', create: 'Crear', search: 'Buscar', loading: 'Cargando...', noData: 'No se encontraron datos' },
    auth: { signIn: 'Iniciar sesión', signOut: 'Cerrar sesión', register: 'Crear cuenta', email: 'Correo', password: 'Contraseña' },
    users: { title: 'Usuarios', addUser: 'Agregar Usuario', editUser: 'Editar Usuario', deleteUser: 'Eliminar Usuario' },
  },
};

export class LocalizationService {
  constructor() {
    this.locale = this._load() || 'en';
    this.translations = TRANSLATIONS;
    this._observers = new Set();
  }

  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations[this.locale];
    for (const k of keys) {
      if (!value) return key;
      value = value[k];
    }
    if (value == null) return key;
    if (typeof value === 'string') {
      return value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
    }
    return value;
  }

  setLocale(locale) {
    this.locale = locale;
    this._save();
    this._observers.forEach((fn) => fn(locale));
  }

  getLocale() { return this.locale; }

  addTranslations(locale, dict) {
    if (!this.translations[locale]) this.translations[locale] = {};
    this._deepMerge(this.translations[locale], dict);
  }

  onChange(fn) {
    this._observers.add(fn);
    return () => this._observers.delete(fn);
  }

  _load() {
    try { return localStorage.getItem(STORAGE_KEYS.LOCALE); } catch { return null; }
  }

  _save() {
    try { localStorage.setItem(STORAGE_KEYS.LOCALE, this.locale); } catch {}
  }

  _deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this._deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
}

export const localizationService = new LocalizationService();