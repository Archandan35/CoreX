const TRANSLATIONS = {
  en: {
    'app.name': 'Universal Enterprise Application',
    'nav.dashboard': 'Dashboard',
    'nav.users': 'Users',
    'nav.roles': 'Roles',
    'nav.settings': 'Settings',
    'auth.signIn': 'Sign In',
    'auth.signOut': 'Sign Out',
    'auth.welcomeBack': 'Welcome back',
    'auth.signInToContinue': 'Sign in to your account to continue',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.invalidCredentials': 'Invalid email or password',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search...',
    'common.loading': 'Loading...',
    'common.noData': 'No data found',
    'common.refresh': 'Refresh',
    'common.confirmDelete': 'Are you sure you want to delete this item? This action cannot be undone.',
    'crud.create': 'Create',
    'crud.edit': 'Edit',
    'crud.delete': 'Delete',
    'crud.bulkDelete': 'Delete selected',
    'pagination.showing': 'Showing',
    'pagination.to': 'to',
    'pagination.of': 'of',
    'pagination.entries': 'entries',
    'pagination.perPage': 'per page',
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your application configuration',
    'settings.general': 'General',
    'settings.appearance': 'Appearance',
    'settings.security': 'Security',
    'settings.notifications': 'Notifications',
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome back',
    'users.title': 'Users',
    'users.create': 'Create User',
    'roles.title': 'Roles & Permissions',
    'roles.create': 'Create Role',
    'error.boundary': 'Something went wrong',
    'error.boundaryMessage': 'An unexpected error occurred',
    'error.tryAgain': 'Try Again',
    'error.notFound': 'Page Not Found',
    'error.notFoundMessage': "The page you're looking for doesn't exist or has been moved.",
    'error.backToDashboard': 'Back to Dashboard',
  },
};

let currentLocale = 'en';

export function setLocale(locale) {
  currentLocale = locale;
}

export function getLocale() {
  return currentLocale;
}

export function t(key, params = {}) {
  const translations = TRANSLATIONS[currentLocale] || TRANSLATIONS.en;
  let text = translations[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

export default { t, setLocale, getLocale };
