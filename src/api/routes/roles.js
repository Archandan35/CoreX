import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export default function roleRoutes(router) {
  router.get('/roles', authenticate, authorize('role:read'), async (req, res) => {
    try {
      const roles = await req.db.roles.findAll();
      res.json({ roles });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch roles.' });
    }
  });

  router.get('/roles/:id', authenticate, authorize('role:read'), async (req, res) => {
    try {
      const role = await req.db.roles.findById(req.params.id);
      if (!role) return res.status(404).json({ error: 'Role not found.' });
      res.json({ role });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch role.' });
    }
  });

  router.post('/roles', authenticate, authorize('role:create'), async (req, res) => {
    try {
      const { name, label, description, permissions } = req.body;
      if (!name || !label) {
        return res.status(400).json({ error: 'Name and label are required.' });
      }
      const role = await req.db.roles.create({
        name, label, description: description || '', permissions: permissions || [],
      });
      res.status(201).json({ role });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create role.' });
    }
  });

  router.put('/roles/:id', authenticate, authorize('role:update'), async (req, res) => {
    try {
      const { name, label, description, permissions } = req.body;
      const role = await req.db.roles.update(req.params.id, { name, label, description, permissions });
      if (!role) return res.status(404).json({ error: 'Role not found.' });
      res.json({ role });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update role.' });
    }
  });

  router.delete('/roles/:id', authenticate, authorize('role:delete'), async (req, res) => {
    try {
      const deleted = await req.db.roles.delete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Role not found.' });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete role.' });
    }
  });

  return router;
}
