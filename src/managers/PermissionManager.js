import { Authority } from '../identity/authority/index.js';

class PermissionManager {
  evaluate(user) {
    return new Authority(user);
  }

  can(user, permission) {
    return new Authority(user).hasAuthority(permission);
  }

  canAny(user, ...permissions) {
    return new Authority(user).hasAnyAuthority(...permissions);
  }

  canAll(user, ...permissions) {
    return new Authority(user).hasAllAuthorities(...permissions);
  }
}

export const permissionManager = new PermissionManager();
