import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { AuthRequest, requireAuth, requirePermission } from '../middleware/auth';
import { CvVersionModel, ApplicationModel } from '../db/models';

const router = Router();

router.use(requireAuth, requirePermission('manage_profile'));

router.get('/profile', async (req: AuthRequest, res: Response) => {
  const cvVersions = await CvVersionModel.find({ candidateId: req.user!.id }).lean();
  return res.json({ cvVersions });
});

router.post('/cv', async (req: AuthRequest, res: Response) => {
  const { jsonData } = req.body as { jsonData?: Record<string, unknown> };
  if (!jsonData) return res.status(400).json({ error: 'missing_cv' });
  const cv = await CvVersionModel.create({ _id: randomUUID(), candidateId: req.user!.id, jsonData });
  return res.status(201).json(cv);
});

router.get('/applications', async (req: AuthRequest, res: Response) => {
  const items = await ApplicationModel.find({ candidateId: req.user!.id }).lean();
  return res.json({ items });
});

export default router;
