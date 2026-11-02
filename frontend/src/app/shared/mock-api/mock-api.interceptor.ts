import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, of, throwError } from 'rxjs';

interface Transaction {
  id: number;
  date: string;
  account: string;
  counterparty: string;
  amount: number;
  currency: string;
  status: 'pending' | 'cleared' | 'failed';
}

const accounts = ['ACC-001', 'ACC-002', 'ACC-003', 'ACC-042'];
const counterparties = ['Globex', 'Initech', 'Umbrella', 'Soylent', 'Wayne', 'Stark', 'Acme'];
const statuses: Transaction['status'][] = ['pending', 'cleared', 'failed'];

const DATA: Transaction[] = Array.from({ length: 120 }, (_, i) => ({
  id: i + 1,
  date: new Date(2026, 0, (i % 60) + 1).toISOString(),
  account: accounts[i % accounts.length],
  counterparty: counterparties[i % counterparties.length],
  amount: Math.round((Math.random() * 10000 - 2000) * 100) / 100,
  currency: ['EUR', 'USD', 'GBP'][i % 3],
  status: statuses[i % statuses.length],
}));

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);

  const url = new URL(req.url, 'http://x');
  const path = url.pathname;
  const q = url.searchParams;

  // GET /api/transactions?page=1&size=20&account=&status=
  if (req.method === 'GET' && path === '/api/transactions') {
    const page = Math.max(1, Number(q.get('page') ?? 1));
    const size = Math.max(1, Number(q.get('size') ?? 20));
    const account = q.get('account') ?? '';
    const status = q.get('status') ?? '';

    let filtered = DATA;
    if (account) filtered = filtered.filter(t => t.account === account);
    if (status)  filtered = filtered.filter(t => t.status === status);

    const start = (page - 1) * size;
    const items = filtered.slice(start, start + size);

    return of(new HttpResponse({ status: 200, body: { items, total: filtered.length, page, size } }))
      .pipe(delay(350));
  }

  // GET /api/transactions/:id
  if (req.method === 'GET' && /^\/api\/transactions\/\d+$/.test(path)) {
    const id = Number(path.split('/').pop());
    const tx = DATA.find(t => t.id === id);
    if (!tx) return throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })).pipe(delay(200));
    return of(new HttpResponse({ status: 200, body: tx })).pipe(delay(200));
  }

  // POST /api/transactions
  if (req.method === 'POST' && path === '/api/transactions') {
    const body = req.body as Partial<Transaction>;
    const newTx: Transaction = {
      id: Math.max(...DATA.map(t => t.id)) + 1,
      date: new Date().toISOString(),
      account: body.account ?? 'ACC-001',
      counterparty: body.counterparty ?? 'Unknown',
      amount: body.amount ?? 0,
      currency: body.currency ?? 'EUR',
      status: body.status ?? 'pending',
    };
    DATA.push(newTx);
    return of(new HttpResponse({ status: 201, body: newTx })).pipe(delay(300));
  }

  // GET /api/accounts
  if (req.method === 'GET' && path === '/api/accounts') {
    return of(new HttpResponse({ status: 200, body: accounts })).pipe(delay(100));
  }

  return throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found (mock)' }));
};
