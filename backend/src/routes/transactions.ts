// GET    /api/transactions?page=&size=&account=&status=&sort=&dir=   — paged list
// GET    /api/transactions/:id                                        — one
// POST   /api/transactions                                            — create
//
// All routes require a valid token. Role doesn't matter for read; add
// `requireRole('admin')` on POST if you want to restrict writes.

import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { authRequired } from '../middleware/auth.js';

export const transactionsRouter = Router();

transactionsRouter.use(authRequired);

const SORTABLE_FIELDS = new Set(['id', 'date', 'account', 'amount', 'status']);

transactionsRouter.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const size = Math.max(1, Math.min(100, Number(req.query.size) || 20));
  const account = (req.query.account as string | undefined)?.trim();
  const search = (req.query.search as string | undefined)?.trim();
  const status = req.query.status as 'pending' | 'cleared' | 'failed' | undefined;
  const sortRaw = (req.query.sort as string | undefined) ?? 'date';
  const dir = (req.query.dir === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  const sort = SORTABLE_FIELDS.has(sortRaw) ? sortRaw : 'date';

  const where: Prisma.TransactionWhereInput = {};
  if (account) where.account = account;
  // `search` = partial, case-insensitive match on account name.
  // Takes precedence over `account` (exact) if both are present, so your
  // frontend experiments can use whichever is simpler.
  if (search) where.account = { contains: search };
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { [sort]: dir },
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({ items, total, page, size });
});

transactionsRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Bad id' });

  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx) return res.status(404).json({ error: 'Not found' });

  res.json(tx);
});

transactionsRouter.post('/', async (req, res) => {
  const { date, account, counterparty, amount, currency, status } = req.body ?? {};
  if (!account || amount == null) {
    return res.status(400).json({ error: 'account and amount are required' });
  }

  const tx = await prisma.transaction.create({
    data: {
      date: date ? new Date(date) : new Date(),
      account: String(account),
      counterparty: counterparty ? String(counterparty) : null,
      amount: Number(amount),
      currency: currency ? String(currency) : 'EUR',
      status: (status as 'pending' | 'cleared' | 'failed') ?? 'pending',
    },
  });

  res.status(201).json(tx);
});
