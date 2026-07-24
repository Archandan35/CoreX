export const auditService = {
  async record({ action, module, user, details }) {
    console.log('[AUDIT]', { action, module, user, details, timestamp: new Date().toISOString() });
    return { ok: true };
  },
};

export default auditService;