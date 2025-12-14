import { Router } from 'express';
import { db } from '../data/store';
import { AuthRequest, requireAuth, requirePermission } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requirePermission('view_applicants'));

router.get('/jobs', (req: AuthRequest, res) => {
  const jobs = db.jobPosts.filter((j) => j.companyId === req.user?.companyId || j.companyId === req.user?.id);
  return res.json({ items: jobs });
});

router.get('/jobs/:id/applicants', (req: AuthRequest, res) => {
  const job = db.jobPosts.find((j) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'job_not_found' });
  const apps = db.applications.filter((a) => a.jobPostId === job.id);
  return res.json({ jobId: job.id, applicants: apps });
});

router.get('/analytics', (req: AuthRequest, res) => {
  const jobs = db.jobPosts.filter((j) => j.companyId === req.user?.companyId || j.companyId === req.user?.id);
  const stats = jobs.map((job) => ({
    jobId: job.id,
    title: job.title,
    applications: db.applications.filter((a) => a.jobPostId === job.id).length,
    premium: job.premiumFlags?.includes('highlight') ?? false,
  }));
  return res.json({ stats });
});

export default router;
