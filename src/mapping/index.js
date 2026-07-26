export class DataMapper {
  map(source, mapping) {
    const result = {};
    for (const [targetKey, sourcePath] of Object.entries(mapping)) {
      if (typeof sourcePath === 'function') {
        result[targetKey] = sourcePath(source);
      } else if (typeof sourcePath === 'string') {
        result[targetKey] = this._getNested(source, sourcePath);
      } else {
        result[targetKey] = sourcePath;
      }
    }
    return result;
  }

  mapCollection(sources, mapping) {
    return sources.map((s) => this.map(s, mapping));
  }

  _getNested(obj, path) {
    return path.split('.').reduce((current, key) => (current ? current[key] : undefined), obj);
  }
}

export const dataMapper = new DataMapper();

export const USER_MAPPING = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  role_label: 'role_label',
  full_access: 'full_access',
  permissions: 'permissions',
  status: 'status',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export const ROLE_MAPPING = {
  id: 'id',
  name: 'name',
  label: 'label',
  description: 'description',
  permissions: 'permissions',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export function mapUser(dbUser) {
  return dbUser ? dataMapper.map(dbUser, USER_MAPPING) : null;
}

export function mapUsers(dbUsers) {
  return dataMapper.mapCollection(dbUsers || [], USER_MAPPING);
}

export function mapRole(dbRole) {
  return dbRole ? dataMapper.map(dbRole, ROLE_MAPPING) : null;
}

export function mapRoles(dbRoles) {
  return dataMapper.mapCollection(dbRoles || [], ROLE_MAPPING);
}
