const DEFAULT_LOCALE = 'en';

const translations = {
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search',
      filter: 'Filter',
      loading: 'Loading...',
      noData: 'No data found.',
      confirm: 'Are you sure?',
      yes: 'Yes',
      no: 'No',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      actions: 'Actions',
    },
    auth: {
      signIn: 'Sign in',
      signOut: 'Sign out',
      register: 'Create account',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot password?',
    },
    users: {
      title: 'Users',
      addUser: 'Add User',
      editUser: 'Edit User',
      deleteUser: 'Delete User',
      name: 'Full Name',
      email: 'Email Address',
      phone: 'Phone',
      role: 'Role',
      status: 'Status',
    },
    roles: {
      title: 'Roles',
      addRole: 'Add Role',
      editRole: 'Edit Role',
      deleteRole: 'Delete Role',
      name: 'Role Name',
      label: 'Display Label',
      description: 'Description',
      permissions: 'Permissions',
    },
    settings: {
      title: 'Settings',
      siteTitle: 'Site Title',
      saved: 'Settings saved.',
    },
    dashboard: {
      title: 'Dashboard',
      totalUsers: 'Total Users',
      activeRoles: 'Active Roles',
      reports: 'Reports',
    },
  },
};

let currentLocale = DEFAULT_LOCALE;

export function setLocale(locale) {
  currentLocale = locale;
}

export function getLocale() {
  return currentLocale;
}

export function t(key, locale) {
  const lang = locale || currentLocale;
  const keys = key.split('.');
  let value = translations[lang];

  for (const k of keys) {
    if (!value || typeof value !== 'object') return key;
    value = value[k];
  }

  return value !== undefined ? value : key;
}

export function addTranslations(locale, dict) {
  if (!translations[locale]) {
    translations[locale] = {};
  }
  deepMerge(translations[locale], dict);
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

export function useT() {
  return { t: (key) => t(key), locale: currentLocale, setLocale };
}
