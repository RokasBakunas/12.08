import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { authenticate, defaultPermissions, issueTokens } from '../data/store';
import { UserModel, AuditLogModel } from '../db/models';
import type { Role } from '../../../../packages/shared/src/types';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const { email, password, role } = req.body as { email?: string; password?: string; role?: string };
  if (!email || !password) return res.status(400).json({ error: 'missing_credentials' });

  const existing = await UserModel.findOne({ email }).lean();
  if (existing) return res.status(409).json({ error: 'user_exists' });

  const hashed = bcrypt.hashSync(password, 10);
  const id = randomUUID();
  const resolvedRole = (role as Role) || 'candidate';
  const permissions = defaultPermissions[resolvedRole] ?? defaultPermissions.candidate;

  await UserModel.create({ _id: id, email, passwordHash: hashed, role: resolvedRole, status: 'pending', permissions });
  await AuditLogModel.create({
    _id: randomUUID(),
    actorId: id,
    action: 'register',
    entityType: 'user',
    entityId: id,
    before: {},
    after: { email, role: resolvedRole },
  });

  return res.status(201).json({ id, email, role: resolvedRole });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: 'missing_credentials' });

  const user = await authenticate(email, password);
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const tokens = issueTokens(user);
  return res.json({ user: { id: user.id, role: user.role }, ...tokens });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) return res.status(400).json({ error: 'missing_refresh' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET || 'dev-secret') as { sub: string };
    const user = await UserModel.findById(payload.sub).lean<{ _id: string; role: Role }>();
    if (!user) return res.status(401).json({ error: 'invalid_user' });
    const tokens = issueTokens({ id: user._id, role: user.role });
    return res.json(tokens);
  } catch {
    return res.status(401).json({ error: 'invalid_refresh' });
  }
});

export default router;
