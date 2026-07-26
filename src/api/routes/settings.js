import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export default function settingsRoutes(router) {
  router.get('/settings', authenticate, authorize('settings:read'), async (req, res) => {
    try {
      const settings = await req.db.settings.getAll();
      res.json({ settings });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch settings.' });
    }
  });

  router.put('/settings', authenticate, authorize('settings:update'), async (req, res) => {
    try {
      const updates = req.body;
      await req.db.settings.update(updates);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update settings.' });
    }
  });

  return router;
}
