import supabaseSync from '../../services/supabaseSync';

export const rolesRepository = {
  async getAll() {
    const roles = await supabaseSync.listRoles();
    return roles || [];
  },

  async getById(id) {
    if (!supabaseSync.isConfigured()) return null;
    const roles = await this.getAll();
    return roles.find(r => r.id === id) || null;
  },

  async create(record) {
    const supabaseRole = await supabaseSync.createRole(record);
    if (!supabaseRole) throw new Error('Failed to create role in database');
    return {
      ...record,
      id: supabaseRole.id || record.id,
    };
  },

  async update(id, patch) {
    const updated = await supabaseSync.updateRole(id, patch);
    if (updated) return updated;
    return null;
  },

  async remove(id) {
    return supabaseSync.deleteRole(id);
  },
};

export default rolesRepository;
