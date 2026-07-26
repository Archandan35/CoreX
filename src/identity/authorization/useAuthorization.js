import { usePermission } from './PermissionContext.jsx';

export function useAuthorization() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, role_label, full_access, permissions } = usePermission();

  const authorize = (permission) => {
    if (!hasPermission(permission)) {
      throw new Error('Unauthorized');
    }
  };

  const can = (permission) => hasPermission(permission);
  const canAny = (...perms) => hasAnyPermission(...perms);
  const canAll = (...perms) => hasAllPermissions(...perms);

  return { authorize, can, canAny, canAll, role_label, full_access, permissions };
}
