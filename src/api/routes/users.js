import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export default function userRoutes(router) {
  router.get('/users', authenticate, authorize('user:read'), async (req, res) => {
    try {
      const users = await req.db.users.findAll();
      res.json({ users });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch users.' });
    }
  });

  router.get('/users/:id', authenticate, authorize('user:read'), async (req, res) => {
    try {
      const user = await req.db.users.findById(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      const { password_hash, ...safe } = user;
      res.json({ user: safe });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch user.' });
    }
  });

  router.post('/users', authenticate, authorize('user:create'), async (req, res) => {
    try {
      const { name, email, phone, password, role } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }
      const existing = await req.db.users.findByEmail(email);
      if (existing) return res.status(409).json({ error: 'Email already in use.' });
      const bcrypt = require('bcrypt');
      const password_hash = await bcrypt.hash(password, 10);
      const user = await req.db.users.create({
        name, email, phone: phone || '', password_hash, role: role || 'user', status: 'active',
      });
      const { password_hash: _, ...safe } = user;
      res.status(201).json({ user: safe });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create user.' });
    }
  });

  router.put('/users/:id', authenticate, authorize('user:update'), async (req, res) => {
    try {
      const { name, email, phone, role, status } = req.body;
      const user = await req.db.users.update(req.params.id, { name, email, phone, role, status });
      if (!user) return res.status(404).json({ error: 'User not found.' });
      const { password_hash, ...safe } = user;
      res.json({ user: safe });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update user.' });
    }
  });

  router.delete('/users/:id', authenticate, authorize('user:delete'), async (req, res) => {
    try {
      const deleted = await req.db.users.delete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'User not found.' });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete user.' });
    }
  });

  return router;
}
