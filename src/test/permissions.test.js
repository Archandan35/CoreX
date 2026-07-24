import { describe, it, expect } from 'vitest';
import { hasPermission, hasAnyPermission, hasAllPermissions, evaluateAuthority, can, cannot } from '../shared/permissions';

describe('permissions', () => {
  it('hasPermission returns true for matching permission', () => {
    expect(hasPermission(['user.list'], 'user.list')).toBe(true);
  });

  it('hasPermission returns false for non-matching permission', () => {
    expect(hasPermission(['user.list'], 'user.delete')).toBe(false);
  });

  it('hasPermission respects wildcard', () => {
    expect(hasPermission(['*'], 'user.list')).toBe(true);
    expect(hasPermission(['*'], 'any.thing')).toBe(true);
  });

  it('hasPermission respects wildcard namespace', () => {
    expect(hasPermission(['user.*'], 'user.list')).toBe(true);
    expect(hasPermission(['user.*'], 'user.create')).toBe(true);
    expect(hasPermission(['user.*'], 'role.list')).toBe(false);
  });

  it('hasAnyPermission returns true if any match', () => {
    expect(hasAnyPermission(['user.list', 'role.list'], ['user.delete', 'user.list'])).toBe(true);
    expect(hasAnyPermission(['user.list'], ['role.list', 'setting.view'])).toBe(false);
  });

  it('hasAllPermissions returns true if all match', () => {
    expect(hasAllPermissions(['user.list', 'user.edit'], ['user.list', 'user.edit'])).toBe(true);
    expect(hasAllPermissions(['user.list'], ['user.list', 'user.edit'])).toBe(false);
  });

  it('evaluateAuthority works with wildcard', () => {
    expect(evaluateAuthority(['case.manage'], 'case.manage')).toBe(true);
    expect(evaluateAuthority(['*'], 'anything')).toBe(true);
  });

  it('can and cannot helpers work', () => {
    const user = { permissions: ['user.list'] };
    expect(can(user, 'user.list')).toBe(true);
    expect(cannot(user, 'user.list')).toBe(false);
    expect(can(user, 'user.delete')).toBe(false);
    expect(cannot(user, 'user.delete')).toBe(true);
  });

  it('handles null/undefined gracefully', () => {
    expect(hasPermission(null, 'test')).toBe(false);
    expect(hasPermission([], null)).toBe(false);
    expect(can(null, 'test')).toBe(false);
    expect(cannot({}, 'test')).toBe(true);
  });
});
