// Express boot. Keeps this file tiny: just wire middleware + mount routers.
// Routes live in src/routes/*.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { transactionsRouter } from './routes/transactions.js';
import { adminRouter } from './routes/admin.js';

const app = express();

// Allow the Angular dev server to talk to us.
app.use(cors({ origin: 'http://localhost:4200', credentials: false }));
app.use(express.json());

// Health check — useful for "is the server actually up"
app.get('/api/health', (_req, res) => res.json({ ok: true, now: new Date().toISOString() }));

app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/admin', adminRouter);

// Catch-all 404 — any unknown /api/* returns a consistent JSON error
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not Found' }));

// Last-resort error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Server error' });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`);
});
