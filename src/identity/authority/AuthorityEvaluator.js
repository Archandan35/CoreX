export class AuthorityEvaluator {
  constructor(user) {
    this.user = user;
    this.policyResolver = null;
    this.capabilityRegistry = null;
  }

  withPolicies(policyResolver) {
    this.policyResolver = policyResolver;
    return this;
  }

  withCapabilities(capabilityRegistry) {
    this.capabilityRegistry = capabilityRegistry;
    return this;
  }

  getContext() {
    return {
      userId: this.user?.id,
      role_label: this.user?.role_label,
      full_access: this.user?.full_access === true,
      permissions: this.user?.permissions || [],
      attributes: this.user?.attributes || {},
      tenant: this.user?.tenant,
      time: new Date(),
    };
  }

  evaluate(action, resource) {
    const context = this.getContext();

    if (this.policyResolver) {
      const resolved = this.policyResolver.resolve(action, resource, context);
      if (resolved === 'deny') return false;
    }

    if (this.capabilityRegistry) {
      const cap = this.capabilityRegistry.get(action);
      if (cap && !cap.evaluate(context)) return false;
    }

    if (context.full_access) return true;
    const permissions = this.user?.permissions || [];
    if (permissions.includes('*')) return true;
    if (permissions.includes(action)) return true;

    return false;
  }

  can(action, resource) {
    return this.evaluate(action, resource);
  }

  cannot(action, resource) {
    return !this.evaluate(action, resource);
  }
}
