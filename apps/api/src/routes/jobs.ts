import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { JobPostModel, ApplicationModel, CvVersionModel, AuditLogModel } from '../db/models';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { location, q } = req.query as { location?: string; q?: string };
  const filter: Record<string, unknown> = { status: 'published' };
  if (location) filter['location'] = { $regex: location, $options: 'i' };
  if (q) filter['title'] = { $regex: q, $options: 'i' };
  const items = await JobPostModel.find(filter).lean();
  return res.json({ items });
});

router.get('/:id', async (req: Request, res: Response) => {
  const job = await JobPostModel.findById(req.params['id']).lean();
  if (!job) return res.status(404).json({ error: 'not_found' });
  const similar = await JobPostModel.find({ location: job.location, _id: { $ne: job._id }, status: 'published' })
    .limit(3)
    .lean();
  return res.json({ job, similar });
});

router.post('/', requireAuth, requirePermission('create_job'), async (req: AuthRequest, res: Response) => {
  const { title, description, location, employmentType, remoteType } = req.body as Record<string, string>;
  if (!title || !description) return res.status(400).json({ error: 'missing_fields' });
  const job = await JobPostModel.create({
    _id: randomUUID(),
    companyId: req.user!.id,
    title,
    description,
    location: location || 'Vilnius',
    employmentType: employmentType || 'full-time',
    remoteType: remoteType || 'onsite',
    experienceLevel: 'mid',
    status: 'pending',
    premiumFlags: [],
  });
  await AuditLogModel.create({
    _id: randomUUID(),
    actorId: req.user!.id,
    action: 'create_job',
    entityType: 'job',
    entityId: job._id,
    before: {},
    after: job.toObject(),
  });
  return res.status(201).json(job);
});

router.post('/:id/publish', requireAuth, requirePermission('manage_job'), async (req: AuthRequest, res: Response) => {
  const job = await JobPostModel.findByIdAndUpdate(
    req.params['id'],
    { status: 'published', publishedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() },
    { new: true },
  ).lean();
  if (!job) return res.status(404).json({ error: 'not_found' });
  return res.json(job);
});

router.post('/:id/apply', requireAuth, requirePermission('apply'), async (req: AuthRequest, res: Response) => {
  const { cvVersionId, coverLetter } = req.body as { cvVersionId?: string; coverLetter?: string };
  const job = await JobPostModel.findById(req.params['id']).lean();
  if (!job) return res.status(404).json({ error: 'not_found' });
  const cvId = cvVersionId || (await CvVersionModel.findOne({ candidateId: req.user!.id }).lean())?._id || 'n/a';
  const application = await ApplicationModel.create({
    _id: randomUUID(),
    jobPostId: job._id,
    candidateId: req.user!.id,
    cvVersionId: cvId,
    coverLetter,
    status: 'submitted',
  });
  return res.status(201).json(application);
});

export default router;
