import { Router } from 'express';
import { db } from '../data/store';
import { requireAuth, requirePermission } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requirePermission('manage_users'));

router.get('/users', (_req, res) => {
  return res.json({ items: db.users.map((u) => ({ id: u.id, email: u.email, role: u.role, status: u.status })) });
});

router.get('/jobs', (_req, res) => {
  return res.json({ items: db.jobPosts });
});

router.post('/jobs/:id/review', (req, res) => {
  const job = db.jobPosts.find((j) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'not_found' });
  const { status } = req.body as { status?: string };
  if (!status) return res.status(400).json({ error: 'missing_status' });
  job.status = status as any;
  return res.json(job);
});

router.get('/reports', (_req, res) => {
  return res.json({ items: db.reports });
});

router.get('/audit', (_req, res) => {
  return res.json({ items: db.auditLog });
});

export default router;
