// JWT verification middleware + role gate.
//
// `authRequired` — rejects unless the request has a valid Bearer token.
// Attaches decoded user info to `req.user` for downstream handlers.
//
// `requireRole('admin')` — authRequired AND role matches, otherwise 403.

import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: number;              // user id
  email: string;
  name: string;
  role: 'user' | 'admin';
}

// Augment Express Request with our user shape.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET missing in .env');
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role: 'user' | 'admin') {
  return (req: Request, res: Response, next: NextFunction) => {
    authRequired(req, res, (err?: unknown) => {
      if (err) return next(err);
      if (req.user?.role !== role) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    });
  };
}
