// GET /api/admin/metrics — admin only. Demo of requireRole.

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireRole } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.get('/metrics', requireRole('admin'), async (_req, res) => {
  const [users, transactions] = await Promise.all([
    prisma.user.count(),
    prisma.transaction.count(),
  ]);
  res.json({
    users,
    transactions,
    uptime: process.uptime().toFixed(0) + 's',
  });
});
