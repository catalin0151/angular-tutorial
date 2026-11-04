// POST /api/auth/login { email, password } -> { token, user }
// GET  /api/auth/me                         -> current user (via token)

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { authRequired, type JwtPayload } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'Server misconfigured' });

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const token = jwt.sign(payload, secret, { expiresIn: '1h' });

  res.json({
    token,
    user: { email: user.email, name: user.name, role: user.role },
  });
});

authRouter.get('/me', authRequired, (req, res) => {
  res.json({
    email: req.user!.email,
    name: req.user!.name,
    role: req.user!.role,
  });
});
