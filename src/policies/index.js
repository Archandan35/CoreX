import { Policy, PolicyResolver } from '../identity/authority/PolicyResolver.js';

const policyResolver = new PolicyResolver();

policyResolver.add(new Policy('admin-full-access', 'allow', ['*'], ['admin', 'super_admin']));
policyResolver.add(new Policy('manager-read', 'allow', ['user:read', 'role:read', 'report:read'], ['manager']));
policyResolver.add(new Policy('user-self', 'allow', ['user:read'], ['user'], [(ctx) => ctx.userId === ctx.resourceOwnerId]));
policyResolver.add(new Policy('viewer-read', 'allow', ['user:read', 'report:read'], ['viewer']));
policyResolver.add(new Policy('super-admin-override', 'allow', ['*'], ['super_admin']));

export function getPolicyResolver() {
  return policyResolver;
}
