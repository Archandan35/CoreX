import { userService } from '@/services/userService.js';
import { roleService } from '@/services/roleService.js';
import { hashPassword } from '@/utils/crypto.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

function stripSecrets(u) {
  if (!u) return u;
  const { passwordHash, salt, ...safe } = u;
  return safe;
}

export function isProtectedUser(u, roles = []) {
  if (!u) return false;
  if (u.id === 'user_admin') return true;
  const byCode = Object.fromEntries((roles || []).map((r) => [r.code, r]));
  const codes = [u.roleCode, ...(u.extraRoles || [])].filter(Boolean);
  return codes.some((c) => byCode[c]?.all === true);
}

export const userLogic = {
  async list() {
    const [users, roles] = await Promise.all([userService.list(), roleService.list()]);
    const byCode = Object.fromEntries(roles.map((r) => [r.code, r]));
    return users.map((u) => ({
      ...stripSecrets(u),
      roleName: byCode[u.roleCode]?.name || u.roleCode || '—',
    }));
  },

  async get(id) {
    const u = await userService.get(id);
    return stripSecrets(u);
  },

  async create(data, actor) {
    try {
      if (!data.email && !data.username) return fail('Email or username is required.');
      if (!data.password) return fail('Password is required.');
      if (!data.roleCode) return fail('A role must be assigned.');

      const allRoles = await roleService.list();
      const targetRole = allRoles.find((r) => r.code === data.roleCode);
      if (!targetRole) return fail(`Role "${data.roleCode}" does not exist.`);

      // Prevent self-assigning an admin-authority role after the first account exists
      if (targetRole.all || targetRole.system) {
        const users = await userService.list().catch(() => []);
        if (users.length > 0) return fail('Administrator role cannot be self-assigned.');
      }

      const { salt, hash } = await hashPassword(data.password);

      const row = await userService.create({
        name: data.name || data.email || data.username,
        email: (data.email || '').toLowerCase(),
        username: (data.username || '').toLowerCase(),
        phone: data.phone,
        address: data.address,
        roleCode: data.roleCode,
        extraRoles: data.extraRoles || [],
        grants: [], denies: [],
        status: data.status || 'Active',
        salt, passwordHash: hash,
        createdAt: nowISO(),
      });

      return ok(stripSecrets(row));
    } catch (e) {
      return fail(e);
    }
  },
};

export default userLogic;