import { usePermission } from '../../identity/authorization/PermissionContext.jsx';

export default function PermissionGate({ permission, children, fallback = null }) {
  const { hasPermission } = usePermission();

  if (!permission) return children;
  if (!hasPermission(permission)) return fallback;

  return children;
}
