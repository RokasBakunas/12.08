export type Role = 'candidate' | 'employer' | 'admin' | 'moderator';
export type Permission =
  | 'view_jobs'
  | 'apply'
  | 'message_employer'
  | 'manage_profile'
  | 'create_job'
  | 'manage_job'
  | 'view_applicants'
  | 'message_candidate'
  | 'view_analytics'
  | 'manage_users'
  | 'manage_jobs'
  | 'view_reports'
  | 'manage_payments'
  | 'view_audit';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: 'active' | 'blocked' | 'pending';
  createdAt: string;
  permissions: Permission[];
  companyId?: string;
  twoFactorEnabled?: boolean;
}

export interface Company {
  id: string;
  name: string;
  code: string;
  description: string;
  website: string;
  logoUrl: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'blocked';
}

export interface JobPost {
  id: string;
  companyId: string;
  title: string;
  description: string;
  salaryMin?: number;
  salaryMax?: number;
  location: string;
  remoteType: 'remote' | 'onsite' | 'hybrid';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'intern';
  experienceLevel: 'junior' | 'mid' | 'senior' | 'lead';
  status: 'draft' | 'pending' | 'published' | 'paused' | 'expired' | 'rejected';
  publishedAt?: string;
  expiresAt?: string;
  premiumFlags?: string[];
  tags?: string[];
}

export interface CvVersion {
  id: string;
  candidateId: string;
  jsonData: Record<string, unknown>;
  fileUrl?: string;
  createdAt: string;
}

export interface Application {
  id: string;
  jobPostId: string;
  candidateId: string;
  cvVersionId: string;
  coverLetter?: string;
  status: 'submitted' | 'reviewed' | 'interview' | 'rejected' | 'offer';
  viewedAt?: string;
  attachments?: string[];
  createdAt: string;
}

export interface MessageThread {
  id: string;
  jobPostId: string;
  candidateId: string;
  employerId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  features: string[];
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'expired';
  startedAt: string;
  endsAt?: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  timestamp: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'job' | 'company' | 'user';
  targetId: string;
  reason: string;
  status: 'open' | 'under_review' | 'resolved';
  createdAt: string;
}
