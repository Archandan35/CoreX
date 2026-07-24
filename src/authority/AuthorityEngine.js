import { hasPermission, hasAnyPermission, hasAllPermissions, evaluateAuthority } from '../shared/permissions';

class AuthorityEngine {
  constructor() {
    this._policies = {};
    this._rules = {};
  }

  definePolicy(name, evaluator) {
    this._policies[name] = evaluator;
  }

  defineRule(name, evaluator) {
    this._rules[name] = evaluator;
  }

  evaluate(user, permission) {
    return hasPermission(user?.permissions || [], permission);
  }

  evaluateAny(user, permissions) {
    return hasAnyPermission(user?.permissions || [], permissions);
  }

  evaluateAll(user, permissions) {
    return hasAllPermissions(user?.permissions || [], permissions);
  }

  evaluateCapability(user, capability) {
    return evaluateAuthority(user?.capabilities || [], capability);
  }

  evaluatePolicy(policyName, user, context = {}) {
    const policy = this._policies[policyName];
    if (!policy) {
      return this.evaluate(user, policyName);
    }
    return policy(user, context);
  }

  evaluateRule(ruleName, user, context = {}) {
    const rule = this._rules[ruleName];
    if (!rule) return false;
    return rule(user, context);
  }

  can(user, permission) {
    return this.evaluate(user, permission);
  }

  cannot(user, permission) {
    return !this.evaluate(user, permission);
  }

  isOwner(user, resource) {
    return user?.id === resource?.userId || user?.id === resource?.ownerId;
  }

  isCreator(user, resource) {
    return user?.id === resource?.createdBy;
  }
}

const authorityEngine = new AuthorityEngine();
export default authorityEngine;
