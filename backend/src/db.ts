// Single Prisma client for the whole app. Importing this file multiple times
// returns the same instance — avoids the "too many connections" problem.
// The optional `log` config echoes every query to the console; comment it out
// when you want silence.

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['query', 'warn', 'error'],
});
