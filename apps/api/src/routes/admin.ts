import { Router, Request, Response } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth';
import { UserModel, JobPostModel, AuditLogModel, ReportModel } from '../db/models';

const router = Router();
router.use(requireAuth, requirePermission('manage_users'));

router.get('/users', async (_req: Request, res: Response) => {
  const items = await UserModel.find({}, { email: 1, role: 1, status: 1 }).lean();
  return res.json({ items });
});

router.get('/jobs', async (_req: Request, res: Response) => {
  const items = await JobPostModel.find().lean();
  return res.json({ items });
});

router.post('/jobs/:id/review', async (req: Request, res: Response) => {
  const { status } = req.body as { status?: string };
  if (!status) return res.status(400).json({ error: 'missing_status' });
  const job = await JobPostModel.findByIdAndUpdate(req.params['id'], { status }, { new: true }).lean();
  if (!job) return res.status(404).json({ error: 'not_found' });
  return res.json(job);
});

router.get('/reports', async (_req: Request, res: Response) => {
  const items = await ReportModel.find().lean();
  return res.json({ items });
});

router.get('/audit', async (_req: Request, res: Response) => {
  const items = await AuditLogModel.find().sort({ timestamp: -1 }).limit(200).lean();
  return res.json({ items });
});

export default router;
