import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const { user, hasFullAccess } = useAuth();

  const value = useMemo(() => {
    const permissions = user?.permissions || [];

    const hasPermission = (permission) => {
      if (!permission) return true;
      if (hasFullAccess) return true;
      if (permissions.includes('*')) return true;
      return permissions.includes(permission);
    };

    const hasAnyPermission = (...perms) => perms.some((p) => hasPermission(p));
    const hasAllPermissions = (...perms) => perms.every((p) => hasPermission(p));

    return {
      role_label: user?.role_label || '',
      full_access: hasFullAccess,
      permissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    };
  }, [user, hasFullAccess]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermission must be used within PermissionProvider');
  return ctx;
}
