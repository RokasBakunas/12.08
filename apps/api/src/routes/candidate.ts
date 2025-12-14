import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../data/store';
import { AuthRequest, requireAuth, requirePermission } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requirePermission('manage_profile'));

router.get('/profile', (req: AuthRequest, res) => {
  const cvList = db.cvVersions.filter((cv) => cv.candidateId === req.user!.id);
  return res.json({ cvVersions: cvList });
});

router.post('/cv', (req: AuthRequest, res) => {
  const { jsonData } = req.body as { jsonData?: Record<string, unknown> };
  if (!jsonData) return res.status(400).json({ error: 'missing_cv' });
  const cv = {
    id: randomUUID(),
    candidateId: req.user!.id,
    jsonData,
    createdAt: new Date().toISOString(),
  };
  db.cvVersions.push(cv);
  return res.status(201).json(cv);
});

router.get('/applications', (req: AuthRequest, res) => {
  const apps = db.applications.filter((a) => a.candidateId === req.user!.id);
  return res.json({ items: apps });
});

export default router;
