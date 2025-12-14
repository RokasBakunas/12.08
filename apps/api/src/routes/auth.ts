import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '../data/store';

const router = Router();

router.post('/register', (req, res) => {
  const { email, password, role } = req.body as { email?: string; password?: string; role?: string };
  if (!email || !password) return res.status(400).json({ error: 'missing_credentials' });
  if (db.users.find((u) => u.email === email)) return res.status(409).json({ error: 'user_exists' });
  const hashed = bcrypt.hashSync(password, 10);
  const id = randomUUID();
  const permissions = db.defaultPermissions[(role as any) || 'candidate'] ?? db.defaultPermissions.candidate;
  db.users.push({
    id,
    email,
    passwordHash: hashed,
    role: (role as any) || 'candidate',
    status: 'pending',
    createdAt: new Date().toISOString(),
    permissions,
  });
  db.auditLog.push({
    id: randomUUID(),
    actorId: id,
    action: 'register',
    entityType: 'user',
    entityId: id,
    before: {},
    after: { email, role },
    timestamp: new Date().toISOString(),
  });
  return res.status(201).json({ id, email, role });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const user = email && password ? db.authenticate(email, password) : null;
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });
  const tokens = db.issueTokens(user);
  return res.json({ user: { id: user.id, role: user.role }, ...tokens });
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) return res.status(400).json({ error: 'missing_refresh' });
  try {
    const payload = (require('jsonwebtoken') as typeof import('jsonwebtoken')).verify(
      refreshToken,
      process.env.JWT_SECRET || 'dev-secret',
    ) as { sub: string };
    const user = db.users.find((u) => u.id === payload.sub);
    if (!user) return res.status(401).json({ error: 'invalid_user' });
    const tokens = db.issueTokens(user);
    return res.json(tokens);
  } catch (error) {
    return res.status(401).json({ error: 'invalid_refresh' });
  }
});

export default router;
