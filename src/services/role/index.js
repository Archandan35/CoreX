import { api } from '../api.js';

async function asJson(res) {
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
  return { ok: res.ok, status: res.status, data };
}

export class RoleService {
  async listRoles() {
    const r = await asJson(await api('/api/roles'));
    return r.ok ? r.data.roles || [] : [];
  }

  async getRole(id) {
    const r = await asJson(await api(`/api/roles/${id}`));
    if (!r.ok) throw new Error(r.data?.error || 'Role not found.');
    return r.data.role;
  }

  async createRole(payload) {
    const r = await asJson(await api('/api/roles', { method: 'POST', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to create role.');
    return r.data.role;
  }

  async updateRole(id, payload) {
    const r = await asJson(await api(`/api/roles/${id}`, { method: 'PUT', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to update role.');
    return r.data.role;
  }

  async deleteRole(id) {
    const r = await asJson(await api(`/api/roles/${id}`, { method: 'DELETE' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to delete role.');
    return true;
  }
}

export const roleService = new RoleService();
