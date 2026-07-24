const PERMISSIONS = {
  user: { list: 'user.list', view: 'user.view', create: 'user.create', edit: 'user.edit', delete: 'user.delete' },
  role: { list: 'role.list', view: 'role.view', create: 'role.create', edit: 'role.edit', delete: 'role.delete' },
  setting: { view: 'setting.view', edit: 'setting.edit' },
  dashboard: { view: 'dashboard.view' },
  audit: { view: 'audit.view' },
};

function evaluateWildcard(permission, wildcardPattern) {
  if (wildcardPattern === '*') return true;
  if (wildcardPattern.endsWith('.*')) {
    const prefix = wildcardPattern.slice(0, -2);
    return permission.startsWith(prefix + '.');
  }
  return permission === wildcardPattern;
}

export function hasPermission(userPermissions, requiredPermission) {
  if (!userPermissions || !requiredPermission) return false;
  return userPermissions.some(p => evaluateWildcard(requiredPermission, p));
}

export function hasAnyPermission(userPermissions, requiredPermissions) {
  if (!userPermissions || !requiredPermissions?.length) return false;
  return requiredPermissions.some(p => hasPermission(userPermissions, p));
}

export function hasAllPermissions(userPermissions, requiredPermissions) {
  if (!userPermissions || !requiredPermissions?.length) return true;
  return requiredPermissions.every(p => hasPermission(userPermissions, p));
}

export function evaluateAuthority(userCapabilities, requiredCapability) {
  if (!userCapabilities || !requiredCapability) return false;
  return userCapabilities.some(c => evaluateWildcard(requiredCapability, c));
}

export function can(user, permission) {
  return hasPermission(user?.permissions, permission);
}

export function cannot(user, permission) {
  return !hasPermission(user?.permissions, permission);
}

export default PERMISSIONS;
