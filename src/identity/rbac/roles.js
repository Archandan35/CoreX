import { PERMISSIONS } from './permissions.js';

const P = PERMISSIONS;

export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  VIEWER: 'viewer',
});

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.SUPER_ADMIN]: ['*'],

  [ROLES.ADMIN]: [
    P.USER_CREATE, P.USER_READ, P.USER_UPDATE, P.USER_DELETE,
    P.ROLE_CREATE, P.ROLE_READ, P.ROLE_UPDATE, P.ROLE_DELETE,
    P.SETTINGS_READ, P.SETTINGS_UPDATE,
    P.REPORT_READ,
  ],

  [ROLES.MANAGER]: [
    P.USER_READ,
    P.ROLE_READ,
    P.REPORT_READ,
  ],

  [ROLES.USER]: [
    P.USER_READ,
  ],

  [ROLES.VIEWER]: [
    P.USER_READ,
    P.REPORT_READ,
  ],
});
