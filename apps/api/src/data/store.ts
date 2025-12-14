import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  Permission,
  Role,
  User,
  Company,
  JobPost,
  Application,
  CvVersion,
  MessageThread,
  Message,
  Notification,
  SubscriptionPlan,
  Subscription,
  AuditLogEntry,
  Report,
} from '../../../../packages/shared/src/types';

const users: User[] = [];
const companies: Company[] = [];
const jobPosts: JobPost[] = [];
const applications: Application[] = [];
const cvVersions: CvVersion[] = [];
const messageThreads: MessageThread[] = [];
const notifications: Notification[] = [];
const plans: SubscriptionPlan[] = [];
const subscriptions: Subscription[] = [];
const auditLog: AuditLogEntry[] = [];
const reports: Report[] = [];

const defaultPermissions: Record<Role, Permission[]> = {
  candidate: ['view_jobs', 'apply', 'message_employer', 'manage_profile'],
  employer: ['create_job', 'manage_job', 'view_applicants', 'message_candidate', 'view_analytics'],
  admin: ['manage_users', 'manage_jobs', 'view_reports', 'manage_payments', 'view_audit'],
  moderator: ['manage_jobs', 'view_reports'],
};

function seed() {
  if (users.length) return;
  const admin: User = {
    id: randomUUID(),
    email: 'admin@example.com',
    passwordHash: bcrypt.hashSync('Admin123!', 10),
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString(),
    permissions: defaultPermissions.admin,
  };
  const company: Company = {
    id: randomUUID(),
    name: 'Baltic Tech',
    code: 'BT-001',
    description: 'Innovative Baltic technology hub.',
    website: 'https://baltic.example.com',
    logoUrl: '',
    createdAt: new Date().toISOString(),
    status: 'approved',
  };
  const employer: User = {
    id: randomUUID(),
    email: 'employer@example.com',
    passwordHash: bcrypt.hashSync('Employer123!', 10),
    role: 'employer',
    status: 'active',
    createdAt: new Date().toISOString(),
    permissions: defaultPermissions.employer,
    companyId: company.id,
  };
  const candidate: User = {
    id: randomUUID(),
    email: 'candidate@example.com',
    passwordHash: bcrypt.hashSync('Candidate123!', 10),
    role: 'candidate',
    status: 'active',
    createdAt: new Date().toISOString(),
    permissions: defaultPermissions.candidate,
  };
  users.push(admin, employer, candidate);
  companies.push(company);
  const job: JobPost = {
    id: randomUUID(),
    companyId: company.id,
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
  };
  jobPosts.push(job);
  const cv: CvVersion = {
    id: randomUUID(),
    candidateId: candidate.id,
    createdAt: new Date().toISOString(),
    jsonData: { summary: 'Full-stack developer', skills: ['Node.js', 'React'] },
  };
  cvVersions.push(cv);
  auditLog.push({
    id: randomUUID(),
    actorId: admin.id,
    action: 'seed',
    entityType: 'system',
    entityId: 'seed',
    before: {},
    after: {},
    timestamp: new Date().toISOString(),
  });
  plans.push({ id: 'starter', name: 'Starter', priceCents: 1999, currency: 'eur', features: ['1 job', '7 days highlight'] });
  subscriptions.push({ id: randomUUID(), userId: employer.id, planId: 'starter', status: 'active', startedAt: new Date().toISOString() });
}

function authenticate(email: string, password: string): User | null {
  const user = users.find((u) => u.email === email);
  if (!user) return null;
  const valid = bcrypt.compareSync(password, user.passwordHash);
  return valid ? user : null;
}

function issueTokens(user: User) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const accessToken = jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, secret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export const db = {
  users,
  companies,
  jobPosts,
  applications,
  cvVersions,
  messageThreads,
  messages,
  notifications,
  plans,
  subscriptions,
  auditLog,
  reports,
  defaultPermissions,
  seed,
  authenticate,
  issueTokens,
};
