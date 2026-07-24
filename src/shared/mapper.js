export class Mapper {
  constructor() { this._mappings = {}; }
  define(sourceType, targetType, mappingFn) {
    this._mappings[`${sourceType}:${targetType}`] = mappingFn;
  }
  map(source, sourceType, targetType) {
    const fn = this._mappings[`${sourceType}:${targetType}`];
    if (!fn) return source;
    return fn(source);
  }
  mapMany(sources, sourceType, targetType) {
    return sources.map(s => this.map(s, sourceType, targetType));
  }
}

export const entityMapper = new Mapper();
export const dtoMapper = new Mapper();
export const viewMapper = new Mapper();
export const permissionMapper = new Mapper();
export const storageMapper = new Mapper();
export const cacheMapper = new Mapper();
export const businessMapper = new Mapper();
export const apiMapper = new Mapper();

entityMapper.define('user:response', 'user:entity', (dto) => ({
  id: dto.id, email: dto.email, name: dto.name,
  role: dto.role, permissions: dto.permissions || [], capabilities: dto.capabilities || [],
  avatar: dto.avatar, status: dto.status || 'active',
  createdAt: dto.created_at || dto.createdAt, updatedAt: dto.updated_at || dto.updatedAt,
}));
entityMapper.define('user:entity', 'user:response', (e) => ({
  id: e.id, email: e.email, name: e.name, role: e.role,
  permissions: e.permissions, capabilities: e.capabilities, avatar: e.avatar,
  status: e.status, created_at: e.createdAt, updated_at: e.updatedAt,
}));
entityMapper.define('role:response', 'role:entity', (dto) => ({
  id: dto.id, name: dto.name, description: dto.description,
  permissions: dto.permissions || [],
  createdAt: dto.created_at || dto.createdAt, updatedAt: dto.updated_at || dto.updatedAt,
}));
entityMapper.define('role:entity', 'role:response', (e) => ({
  id: e.id, name: e.name, description: e.description, permissions: e.permissions,
  created_at: e.createdAt, updated_at: e.updatedAt,
}));
entityMapper.define('setting:response', 'setting:entity', (dto) => ({
  id: dto.id, key: dto.key, value: dto.value, type: dto.type || typeof dto.value,
}));
entityMapper.define('setting:entity', 'setting:response', (e) => ({
  id: e.id, key: e.key, value: e.value, type: e.type,
}));

dtoMapper.define('user:entity', 'user:dto', (e) => ({
  id: e.id, email: e.email, displayName: e.name,
  roleName: e.role, permissionList: e.permissions,
}));
dtoMapper.define('user:dto', 'user:entity', (d) => ({
  id: d.id, email: d.email, name: d.displayName,
  role: d.roleName, permissions: d.permissionList || [],
}));
dtoMapper.define('api:error', 'domain:error', (apiErr) => ({
  code: apiErr.code || 'UNKNOWN', message: apiErr.message || 'An error occurred',
  details: apiErr.details || {}, timestamp: new Date().toISOString(),
}));

viewMapper.define('user:entity', 'user:view', (e) => ({
  id: e.id, label: `${e.name} (${e.email})`, role: e.role, status: e.status, avatar: e.avatar,
}));
viewMapper.define('role:entity', 'role:view', (e) => ({
  id: e.id, label: e.name, permissionCount: e.permissions?.length || 0,
}));
viewMapper.define('setting:entity', 'setting:view', (e) => ({
  key: e.key, value: e.value, type: e.type,
}));

permissionMapper.define('user:entity', 'permission:list', (user) => user.permissions || []);
permissionMapper.define('role:entity', 'permission:list', (role) => role.permissions || []);
permissionMapper.define('permission:string', 'permission:resource', (perm) => perm.split('.')[0]);
permissionMapper.define('permission:string', 'permission:action', (perm) => perm.split('.').slice(1).join('.'));

storageMapper.define('user:entity', 'storage:json', (e) => JSON.stringify(e));
storageMapper.define('storage:json', 'user:entity', (json) => JSON.parse(json));
storageMapper.define('any:entity', 'storage:blob', (e) => new Blob([JSON.stringify(e, null, 2)], { type: 'application/json' }));

cacheMapper.define('user:entity', 'cache:key', (e) => `user:${e.id}`);
cacheMapper.define('role:entity', 'cache:key', (e) => `role:${e.id}`);
cacheMapper.define('setting:entity', 'cache:key', (e) => `setting:${e.key}`);
cacheMapper.define('query:params', 'cache:key', (q) => `query:${JSON.stringify(q)}`);

businessMapper.define('user:entity', 'business:profile', (e) => ({
  id: e.id, displayName: e.name, email: e.email, permissions: e.permissions,
  isActive: e.status === 'active', isAdmin: e.permissions?.includes('*') || false,
}));
businessMapper.define('role:entity', 'business:summary', (e) => ({
  name: e.name, description: e.description, permissionCount: e.permissions?.length || 0,
}));
businessMapper.define('user:entity', 'business:auditEntry', (e) => ({
  userId: e.id, userEmail: e.email, userName: e.name, userRole: e.role,
}));

apiMapper.define('internal:user', 'api:v1:user', (e) => ({
  data: { id: e.id, type: 'user', attributes: { email: e.email, name: e.name, role: e.role, status: e.status } },
}));
apiMapper.define('api:v1:user', 'internal:user', (api) => ({
  id: api.data?.id, email: api.data?.attributes?.email, name: api.data?.attributes?.name,
  role: api.data?.attributes?.role, status: api.data?.attributes?.status,
}));
apiMapper.define('internal:paginated', 'api:v1:response', (result) => ({
  data: result.data, meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
}));

export default entityMapper;
