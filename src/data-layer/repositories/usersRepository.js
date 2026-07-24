import supabaseSync from '../../services/supabaseSync';

export const usersRepository = {
  async getAll() {
    const users = await supabaseSync.listUsers();
    return users || [];
  },

  async getById(id) {
    if (!supabaseSync.isConfigured()) return null;
    const users = await this.getAll();
    return users.find(u => u.id === id) || null;
  },

  async create(record) {
    const supabaseUser = await supabaseSync.createUser(record);
    if (!supabaseUser) throw new Error('Failed to create user in database');
    return {
      ...record,
      id: supabaseUser.id || record.id,
    };
  },

  async update(id, patch) {
    const updated = await supabaseSync.updateUser(id, patch);
    if (updated) return updated;
    return null;
  },

  async remove(id) {
    return supabaseSync.deleteUser(id);
  },
};

export default usersRepository;
