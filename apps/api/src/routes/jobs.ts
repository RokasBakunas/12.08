import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../data/store';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', (_req, res) => {
  const { location, q } = _req.query as { location?: string; q?: string };
  const filtered = db.jobPosts.filter((job) => {
    const matchesLocation = location ? job.location.toLowerCase().includes(location.toLowerCase()) : true;
    const matchesTitle = q ? job.title.toLowerCase().includes(q.toLowerCase()) : true;
    return matchesLocation && matchesTitle && job.status === 'published';
  });
  return res.json({ items: filtered });
});

router.get('/:id', (req, res) => {
  const job = db.jobPosts.find((j) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'not_found' });
  const similar = db.jobPosts.filter((j) => j.location === job.location && j.id !== job.id).slice(0, 3);
  return res.json({ job, similar });
});

router.post('/', requireAuth, requirePermission('create_job'), (req: AuthRequest, res) => {
  const { title, description, location, employmentType, remoteType } = req.body as Record<string, string>;
  if (!title || !description) return res.status(400).json({ error: 'missing_fields' });
  const job = {
    id: randomUUID(),
    companyId: req.user?.id ?? 'unknown',
    title,
    description,
    location: location || 'Vilnius',
    employmentType: (employmentType as any) || 'full-time',
    remoteType: (remoteType as any) || 'onsite',
    experienceLevel: 'mid',
    status: 'pending',
    premiumFlags: [],
    publishedAt: undefined,
    expiresAt: undefined,
    salaryMin: undefined,
    salaryMax: undefined,
  };
  db.jobPosts.push(job as any);
  db.auditLog.push({
    id: randomUUID(),
    actorId: req.user?.id || 'system',
    action: 'create_job',
    entityType: 'job',
    entityId: job.id,
    before: {},
    after: job,
    timestamp: new Date().toISOString(),
  });
  return res.status(201).json(job);
});

router.post('/:id/publish', requireAuth, requirePermission('manage_job'), (req: AuthRequest, res) => {
  const job = db.jobPosts.find((j) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'not_found' });
  job.status = 'published';
  job.publishedAt = new Date().toISOString();
  job.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  return res.json(job);
});

router.post('/:id/apply', requireAuth, requirePermission('apply'), (req: AuthRequest, res) => {
  const { cvVersionId, coverLetter } = req.body as { cvVersionId?: string; coverLetter?: string };
  const job = db.jobPosts.find((j) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'not_found' });
  const application = {
    id: randomUUID(),
    jobPostId: job.id,
    candidateId: req.user!.id,
    cvVersionId: cvVersionId || db.cvVersions.find((cv) => cv.candidateId === req.user!.id)?.id || 'n/a',
    coverLetter,
    status: 'submitted' as const,
    createdAt: new Date().toISOString(),
  };
  db.applications.push(application);
  return res.status(201).json(application);
});

export default router;
