import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import type { Permission, Role, User } from '../../../../packages/shared/src/types';
import {
  UserModel,
  CompanyModel,
  JobPostModel,
  AuditLogModel,
  CvVersionModel,
  SubscriptionPlanModel,
  SubscriptionModel,
} from '../db/models';

export const defaultPermissions: Record<Role, Permission[]> = {
  candidate: ['view_jobs', 'apply', 'message_employer', 'manage_profile'],
  employer: ['create_job', 'manage_job', 'view_applicants', 'message_candidate', 'view_analytics'],
  admin: ['manage_users', 'manage_jobs', 'view_reports', 'manage_payments', 'view_audit'],
  moderator: ['manage_jobs', 'view_reports'],
};

/** Idempotent seed – runs once per DB (skips if admin already exists). */
export async function seed(): Promise<void> {
  const exists = await UserModel.findOne({ email: 'admin@example.com' }).lean();
  if (exists) return;

  const adminId = randomUUID();
  const companyId = randomUUID();
  const employerId = randomUUID();
  const candidateId = randomUUID();

  await CompanyModel.create({
    _id: companyId,
    name: 'Baltic Tech',
    code: 'BT-001',
    description: 'Innovative Baltic technology hub.',
    website: 'https://baltic.example.com',
    logoUrl: '',
    status: 'approved',
  });

  await UserModel.create([
    {
      _id: adminId,
      email: 'admin@example.com',
      passwordHash: bcrypt.hashSync('Admin123!', 10),
      role: 'admin',
      status: 'active',
      permissions: defaultPermissions.admin,
    },
    {
      _id: employerId,
      email: 'employer@example.com',
      passwordHash: bcrypt.hashSync('Employer123!', 10),
      role: 'employer',
      status: 'active',
      permissions: defaultPermissions.employer,
      companyId,
    },
    {
      _id: candidateId,
      email: 'candidate@example.com',
      passwordHash: bcrypt.hashSync('Candidate123!', 10),
      role: 'candidate',
      status: 'active',
      permissions: defaultPermissions.candidate,
    },
  ]);

  const jobId = randomUUID();
  await JobPostModel.create({
    _id: jobId,
    companyId,
    title: 'Front-end Engineer',
    description: 'Build SSR-ready recruitment experiences.',
    salaryMin: 4000,
    salaryMax: 6000,
    location: 'Vilnius',
    remoteType: 'hybrid',
    employmentType: 'full-time',
    experienceLevel: 'mid',
    status: 'published',
    publishedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    premiumFlags: ['highlight'],
    tags: ['React', 'TypeScript'],
  });

  await CvVersionModel.create({
    _id: randomUUID(),
    candidateId,
    jsonData: { summary: 'Full-stack developer', skills: ['Node.js', 'React'] },
  });

  await AuditLogModel.create({
    _id: randomUUID(),
    actorId: adminId,
    action: 'seed',
    entityType: 'system',
    entityId: 'seed',
    before: {},
    after: {},
  });

  await SubscriptionPlanModel.create({
    _id: 'starter',
    name: 'Starter',
    priceCents: 1999,
    currency: 'eur',
    features: ['1 job', '7 days highlight'],
  });

  await SubscriptionModel.create({
    _id: randomUUID(),
    userId: employerId,
    planId: 'starter',
    status: 'active',
  });
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const user = await UserModel.findOne({ email }).lean<User & { _id: string }>();
  if (!user) return null;
  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) return null;
  return { ...user, id: user._id } as unknown as User;
}

export function issueTokens(user: { id: string; role: Role }) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const accessToken = jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, secret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}
