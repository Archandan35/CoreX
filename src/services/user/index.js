import { api } from '../api.js';

async function asJson(res) {
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
  return { ok: res.ok, status: res.status, data };
}

export class UserService {
  async listUsers() {
    const r = await asJson(await api('/api/users'));
    return r.ok ? r.data.users || [] : [];
  }

  async getUser(id) {
    const r = await asJson(await api(`/api/users/${id}`));
    if (!r.ok) throw new Error(r.data?.error || 'User not found.');
    return r.data.user;
  }

  async createUser(payload) {
    const r = await asJson(await api('/api/users', { method: 'POST', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to create user.');
    return r.data.user;
  }

  async updateUser(id, payload) {
    const r = await asJson(await api(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to update user.');
    return r.data.user;
  }

  async deleteUser(id) {
    const r = await asJson(await api(`/api/users/${id}`, { method: 'DELETE' }));
    if (!r.ok) throw new Error(r.data?.error || 'Failed to delete user.');
    return true;
  }
}

export const userService = new UserService();
