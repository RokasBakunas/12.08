import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../data/store';
import { Permission, Role } from '../../../../packages/shared/src/types';

export interface AuthRequest extends Request {
  user?: { id: string; role: Role; permissions: Permission[] };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'missing_token' });
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { sub: string; role: Role };
    const user = db.users.find((u) => u.id === payload.sub);
    if (!user) return res.status(401).json({ error: 'invalid_user' });
    req.user = { id: user.id, role: user.role, permissions: user.permissions };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

export function requirePermission(permission: Permission) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'missing_user' });
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'forbidden', missing: permission });
    }
    return next();
  };
}
