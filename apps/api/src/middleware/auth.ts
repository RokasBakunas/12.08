import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../db/models';
import type { Permission, Role } from '../../../../packages/shared/src/types';

export interface AuthRequest extends Request {
  user?: { id: string; role: Role; permissions: Permission[]; companyId?: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'missing_token' });
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { sub: string; role: Role };
    // Attach minimal user info from token; routes that need full DB data should query directly
    UserModel.findById(payload.sub)
      .lean<{ _id: string; role: Role; permissions: Permission[]; companyId?: string }>()
      .then((user) => {
        if (!user) return res.status(401).json({ error: 'invalid_user' });
        req.user = { id: user._id, role: user.role, permissions: user.permissions, companyId: user.companyId };
        return next();
      })
      .catch(() => res.status(500).json({ error: 'auth_error' }));
  } catch {
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
