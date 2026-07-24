import { describe, it, expect } from 'vitest';
import { Mapper, entityMapper, dtoMapper, viewMapper, businessMapper, apiMapper, permissionMapper, storageMapper, cacheMapper } from '../shared/mapper';

describe('mapper', () => {
  it('Mapper base class defines and maps', () => {
    const m = new Mapper();
    m.define('user', 'display', (u) => ({ label: u.name, value: u.id }));
    const result = m.map({ id: 1, name: 'Alice' }, 'user', 'display');
    expect(result.label).toBe('Alice');
    expect(result.value).toBe(1);
  });

  it('mapMany works', () => {
    const m = new Mapper();
    m.define('user', 'display', (u) => ({ label: u.name }));
    const results = m.mapMany([{ name: 'A' }, { name: 'B' }], 'user', 'display');
    expect(results).toHaveLength(2);
    expect(results[0].label).toBe('A');
  });

  it('entityMapper maps user entity', () => {
    const result = entityMapper.map({ id: 1, email: 'a@b.com', name: 'Alice', role: 'admin' }, 'user:response', 'user:entity');
    expect(result.id).toBe(1);
    expect(result.email).toBe('a@b.com');
  });

  it('dtoMapper maps DTO fields', () => {
    const input = { id: 1, email: 'test@test.com', name: 'Test', role: 'admin', permissions: ['read'] };
    const result = dtoMapper.map(input, 'user:entity', 'user:dto');
    expect(result.displayName).toBe('Test');
    expect(result.roleName).toBe('admin');
  });

  it('viewMapper maps view fields', () => {
    const result = viewMapper.map({ id: 1, name: 'Alice', email: 'a@b.com', role: 'admin', status: 'active' }, 'user:entity', 'user:view');
    expect(result.label).toContain('Alice');
  });

  it('businessMapper maps business fields', () => {
    const result = businessMapper.map({ id: 1, name: 'Alice', email: 'a@b.com', status: 'active', permissions: ['*'] }, 'user:entity', 'business:profile');
    expect(result.isAdmin).toBe(true);
    expect(result.isActive).toBe(true);
  });

  it('apiMapper maps API request/response', () => {
    const result = apiMapper.map({ id: 1, email: 'a@b.com', name: 'Alice', role: 'admin', status: 'active' }, 'internal:user', 'api:v1:user');
    expect(result.data.type).toBe('user');
    expect(result.data.attributes.name).toBe('Alice');
  });

  it('permissionMapper maps permission fields', () => {
    const result = permissionMapper.map(['user.*', 'role.list'], 'user:entity', 'permission:list');
    expect(Array.isArray(result)).toBe(true);
  });

  it('storageMapper maps storage fields', () => {
    const result = storageMapper.map({ id: 1, name: 'test' }, 'user:entity', 'storage:json');
    expect(typeof result).toBe('string');
    expect(JSON.parse(result).name).toBe('test');
  });

  it('cacheMapper maps cache fields', () => {
    const result = cacheMapper.map({ id: 5 }, 'user:entity', 'cache:key');
    expect(result).toBe('user:5');
  });
});
