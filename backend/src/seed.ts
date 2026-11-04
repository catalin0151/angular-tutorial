// Idempotent seed: wipes and re-creates demo data. Safe to re-run.
// Three users (one admin, two regular), 120 transactions spread across
// a few accounts, counterparties, and statuses.

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './db.js';

const accounts = ['ACC-001', 'ACC-002', 'ACC-003', 'ACC-042'];
const counterparties = ['Globex', 'Initech', 'Umbrella', 'Soylent', 'Wayne', 'Stark', 'Acme'];
const statuses = ['pending', 'cleared', 'failed'] as const;

async function main() {
  console.log('[seed] wiping existing data…');
  await prisma.transaction.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('[seed] inserting users…');
  const hash = (pwd: string) => bcrypt.hash(pwd, 10);

  await prisma.user.createMany({
    data: [
      { email: 'alice@db.com',  name: 'Alice',  role: 'admin', passwordHash: await hash('alice')  },
      { email: 'bob@db.com',    name: 'Bob',    role: 'user',  passwordHash: await hash('bob')    },
      { email: 'carlos@db.com', name: 'Carlos', role: 'user',  passwordHash: await hash('carlos') },
    ],
  });

  console.log('[seed] inserting transactions…');
  const txData = Array.from({ length: 120 }, (_, i) => ({
    date: new Date(2026, 0, (i % 60) + 1),
    account: accounts[i % accounts.length],
    counterparty: counterparties[i % counterparties.length],
    amount: Math.round((Math.random() * 10000 - 2000) * 100) / 100,
    currency: ['EUR', 'USD', 'GBP'][i % 3],
    status: statuses[i % statuses.length],
  }));
  await prisma.transaction.createMany({ data: txData });

  const userCount = await prisma.user.count();
  const txCount = await prisma.transaction.count();
  console.log(`[seed] done — ${userCount} users, ${txCount} transactions`);
}

main()
  .catch(err => {
    console.error('[seed] failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
