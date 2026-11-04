import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Transaction {
  id: number;
  date: string;
  account: string;
  counterparty: string;
  amount: number;
  currency: string;
  status: 'pending' | 'cleared' | 'failed';
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private readonly http = inject(HttpClient);

  list(params: { page?: number; size?: number; account?: string; status?: string; sort?: string; dir?: 'asc' | 'desc' } = {}) {
    const search = new URLSearchParams();
    if (params.page)    search.set('page',    String(params.page));
    if (params.size)    search.set('size',    String(params.size));
    if (params.account) search.set('account', params.account);
    if (params.status)  search.set('status',  params.status);
    if (params.sort)    search.set('sort',    params.sort);
    if (params.dir)     search.set('dir',     params.dir);
    return this.http.get<Page<Transaction>>(`/api/transactions?${search.toString()}`);
  }

  get(id: number) {
    return this.http.get<Transaction>(`/api/transactions/${id}`);
  }

  create(input: Partial<Transaction>) {
    return this.http.post<Transaction>('/api/transactions', input);
  }

  accounts() {
    return this.http.get<string[]>('/api/accounts');
  }
}
