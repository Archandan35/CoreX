import { createContext, useContext } from 'react';
import { useAuth } from '../auth/AuthContext';
import authorityEngine from './AuthorityEngine';

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const { user, permissions, capabilities } = useAuth();

  const value = {
    can: (permission) => authorityEngine.evaluate(user, permission),
    cannot: (permission) => authorityEngine.cannot(user, permission),
    canAny: (perms) => authorityEngine.evaluateAny(user, perms),
    canAll: (perms) => authorityEngine.evaluateAll(user, perms),
    canCapability: (cap) => authorityEngine.evaluateCapability(user, cap),
    evaluatePolicy: (name, ctx) => authorityEngine.evaluatePolicy(name, user, ctx),
    isOwner: (resource) => authorityEngine.isOwner(user, resource),
    isCreator: (resource) => authorityEngine.isCreator(user, resource),
    permissions,
    capabilities,
    userRole: user?.role || '',
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermission() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermission must be used within PermissionProvider');
  return ctx;
}

export default PermissionContext;
