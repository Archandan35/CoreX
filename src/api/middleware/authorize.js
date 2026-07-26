export function authorize(...allowedPermissions) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const rolePermissions = user.permissions || [];
    if (rolePermissions.includes('*')) return next();

    const hasPermission = allowedPermissions.some((p) => rolePermissions.includes(p));
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }

    next();
  };
}

export function authorizeResourceOwner(entityKey) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const rolePermissions = user.permissions || [];
    if (rolePermissions.includes('*')) return next();

    const resourceId = req.params.id;
    if (user.id === resourceId) return next();

    const hasUserUpdate = rolePermissions.includes('user:update');
    if (hasUserUpdate) return next();

    return res.status(403).json({ error: 'Forbidden. You can only access your own resources.' });
  };
}
