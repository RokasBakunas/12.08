/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Schema, model, models } from 'mongoose';
import { randomUUID } from 'crypto';

// ── Shared JSON transform: rename _id → id, strip __v ───────────────────────
const transform = (_doc: any, ret: Record<string, unknown>) => {
  ret['id'] = ret['_id'];
  delete ret['_id'];
  delete ret['__v'];
  return ret;
};
const toJSON = { transform };

// ── User ─────────────────────────────────────────────────────────────────────
const UserSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['candidate', 'employer', 'admin', 'moderator'], default: 'candidate' },
    status: { type: String, enum: ['active', 'blocked', 'pending'], default: 'pending' },
    permissions: [String],
    companyId: String,
    createdAt: { type: String, default: () => new Date().toISOString() },
    twoFactorEnabled: Boolean,
  },
  { _id: false, id: false, toJSON },
);

// ── Company ───────────────────────────────────────────────────────────────────
const CompanySchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    name: { type: String, required: true },
    code: String,
    description: String,
    website: String,
    logoUrl: String,
    createdAt: { type: String, default: () => new Date().toISOString() },
    status: { type: String, enum: ['pending', 'approved', 'blocked'], default: 'pending' },
  },
  { _id: false, id: false, toJSON },
);

// ── JobPost ───────────────────────────────────────────────────────────────────
const JobPostSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    companyId: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    salaryMin: Number,
    salaryMax: Number,
    location: String,
    remoteType: { type: String, enum: ['remote', 'onsite', 'hybrid'], default: 'onsite' },
    employmentType: { type: String, enum: ['full-time', 'part-time', 'contract', 'intern'], default: 'full-time' },
    experienceLevel: { type: String, enum: ['junior', 'mid', 'senior', 'lead'], default: 'mid' },
    status: {
      type: String,
      enum: ['draft', 'pending', 'published', 'paused', 'expired', 'rejected'],
      default: 'pending',
    },
    publishedAt: String,
    expiresAt: String,
    premiumFlags: [String],
    tags: [String],
  },
  { _id: false, id: false, toJSON },
);

// ── Application ───────────────────────────────────────────────────────────────
const ApplicationSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    jobPostId: { type: String, required: true },
    candidateId: { type: String, required: true },
    cvVersionId: String,
    coverLetter: String,
    status: {
      type: String,
      enum: ['submitted', 'reviewed', 'interview', 'rejected', 'offer'],
      default: 'submitted',
    },
    viewedAt: String,
    attachments: [String],
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false, id: false, toJSON },
);

// ── CvVersion ─────────────────────────────────────────────────────────────────
const CvVersionSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    candidateId: { type: String, required: true },
    jsonData: Schema.Types.Mixed,
    fileUrl: String,
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false, id: false, toJSON },
);

// ── AuditLogEntry ─────────────────────────────────────────────────────────────
const AuditLogSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    actorId: String,
    action: String,
    entityType: String,
    entityId: String,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    timestamp: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false, id: false, toJSON },
);

// ── Report ────────────────────────────────────────────────────────────────────
const ReportSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    reporterId: String,
    targetType: { type: String, enum: ['job', 'company', 'user'] },
    targetId: String,
    reason: String,
    status: { type: String, enum: ['open', 'under_review', 'resolved'], default: 'open' },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false, id: false, toJSON },
);

// ── SubscriptionPlan ──────────────────────────────────────────────────────────
const SubscriptionPlanSchema = new Schema(
  {
    _id: { type: String },
    name: String,
    priceCents: Number,
    currency: String,
    features: [String],
  },
  { _id: false, id: false, toJSON },
);

// ── Subscription ──────────────────────────────────────────────────────────────
const SubscriptionSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: String,
    planId: String,
    status: { type: String, enum: ['active', 'canceled', 'expired'], default: 'active' },
    startedAt: { type: String, default: () => new Date().toISOString() },
    endsAt: String,
  },
  { _id: false, id: false, toJSON },
);

// ── Export models (safe for serverless hot-reload) ────────────────────────────
export const UserModel = (models['User'] ?? model('User', UserSchema)) as mongoose.Model<any>;
export const CompanyModel = (models['Company'] ?? model('Company', CompanySchema)) as mongoose.Model<any>;
export const JobPostModel = (models['JobPost'] ?? model('JobPost', JobPostSchema)) as mongoose.Model<any>;
export const ApplicationModel = (models['Application'] ?? model('Application', ApplicationSchema)) as mongoose.Model<any>;
export const CvVersionModel = (models['CvVersion'] ?? model('CvVersion', CvVersionSchema)) as mongoose.Model<any>;
export const AuditLogModel = (models['AuditLog'] ?? model('AuditLog', AuditLogSchema)) as mongoose.Model<any>;
export const ReportModel = (models['Report'] ?? model('Report', ReportSchema)) as mongoose.Model<any>;
export const SubscriptionPlanModel = (models['SubscriptionPlan'] ?? model('SubscriptionPlan', SubscriptionPlanSchema)) as mongoose.Model<any>;
export const SubscriptionModel = (models['Subscription'] ?? model('Subscription', SubscriptionSchema)) as mongoose.Model<any>;
