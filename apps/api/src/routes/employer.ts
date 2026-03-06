import { Router, Response } from 'express';
import { AuthRequest, requireAuth, requirePermission } from '../middleware/auth';
import { JobPostModel, ApplicationModel } from '../db/models';

const router = Router();

router.use(requireAuth, requirePermission('view_applicants'));

router.get('/jobs', async (req: AuthRequest, res: Response) => {
  const companyId = req.user!.companyId || req.user!.id;
  const items = await JobPostModel.find({ companyId }).lean();
  return res.json({ items });
});

router.get('/jobs/:id/applicants', async (req: AuthRequest, res: Response) => {
  const job = await JobPostModel.findById(req.params['id']).lean();
  if (!job) return res.status(404).json({ error: 'job_not_found' });
  const applicants = await ApplicationModel.find({ jobPostId: job._id }).lean();
  return res.json({ jobId: job._id, applicants });
});

router.get('/analytics', async (req: AuthRequest, res: Response) => {
  const companyId = req.user!.companyId || req.user!.id;
  const jobs = await JobPostModel.find({ companyId }).lean();
  const stats = await Promise.all(
    jobs.map(async (job) => ({
      jobId: job._id,
      title: job.title,
      applications: await ApplicationModel.countDocuments({ jobPostId: job._id }),
      premium: job.premiumFlags?.includes('highlight') ?? false,
    })),
  );
  return res.json({ stats });
});

export default router;
