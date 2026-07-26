import { PERMISSIONS } from '../rbac/permissions.js';

export class Authority {
  constructor(user) {
    this.user = user;
    this._resolved = null;
  }

  getRoleLabel() {
    return this.user?.role_label || '';
  }

  isFullAccess() {
    return this.user?.full_access === true;
  }

  getPermissions() {
    if (this.isFullAccess()) return ['*'];
    return this.user?.permissions || [];
  }

  hasAuthority(authority) {
    if (!authority) return true;
    if (this.isFullAccess()) return true;
    const perms = this.getPermissions();
    if (perms.includes('*')) return true;
    return perms.includes(authority);
  }

  hasAnyAuthority(...authorities) {
    return authorities.some((a) => this.hasAuthority(a));
  }

  hasAllAuthorities(...authorities) {
    return authorities.every((a) => this.hasAuthority(a));
  }

  canCreate(entity) { return this.hasAuthority(`${entity}:create`); }
  canRead(entity) { return this.hasAuthority(`${entity}:read`); }
  canUpdate(entity) { return this.hasAuthority(`${entity}:update`); }
  canDelete(entity) { return this.hasAuthority(`${entity}:delete`); }

  getContext() {
    return {
      userId: this.user?.id,
      role_label: this.getRoleLabel(),
      full_access: this.isFullAccess(),
      permissions: this.getPermissions(),
      isFullAccess: this.isFullAccess(),
    };
  }
}

export class Capability {
  constructor(name, description, effect = 'allow') {
    this.name = name;
    this.description = description;
    this.effect = effect;
    this.conditions = [];
  }

  when(condition) {
    this.conditions.push(condition);
    return this;
  }

  evaluate(context) {
    if (this.effect === 'deny') return false;
    if (this.conditions.length === 0) return true;
    return this.conditions.every((c) => c(context));
  }
}

export class CapabilityRegistry {
  constructor() {
    this._capabilities = new Map();
  }

  register(capability) {
    this._capabilities.set(capability.name, capability);
  }

  get(name) {
    return this._capabilities.get(name);
  }

  has(name) {
    return this._capabilities.has(name);
  }

  evaluate(name, context) {
    const cap = this._capabilities.get(name);
    if (!cap) return false;
    return cap.evaluate(context);
  }

  getAllowed(context) {
    const allowed = [];
    for (const [, cap] of this._capabilities) {
      if (cap.evaluate(context)) allowed.push(cap.name);
    }
    return allowed;
  }
}

export const capabilityRegistry = new CapabilityRegistry();
