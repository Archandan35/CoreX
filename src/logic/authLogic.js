import { userService } from '@/services/userService.js';
import { ok, fail } from '@/utils/result.js';

export const authLogic = {
  async forgotPassword(identifier) {
    try {
      const users = await userService.list();
      const user = users.find(u =>
        u.email === identifier.trim() ||
        u.username === identifier.trim() ||
        u.phone === identifier.trim()
      );

      if (!user) {
        return { ok: true, data: { message: 'If an account exists, a reset link has been sent.' } };
      }

      // In a real implementation, this would send an email with a reset link
      // For demo purposes, we return a demo token
      const demoToken = 'DEMO_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      return {
        ok: true,
        data: {
          message: 'No email is sent in this client-side demo. A System Owner can reset passwords in User Management.',
          token: 'DEMO_' + Math.random().toString(36).substring(2, 8).toUpperCase()
        }
      };
    } catch (err) {
      return { ok: false, error: 'Failed to process password reset request' };
    }
  }
};

export default authLogic;