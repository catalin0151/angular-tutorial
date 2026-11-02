import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TransactionsService, Transaction } from './transactions.service';

@Component({
  selector: 'app-ch09-http-backend',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './ch09-http-backend.html',
  styleUrl: './ch09-http-backend.css',
})
export class Ch09HttpBackend {
  private readonly api = inject(TransactionsService);

  readonly items = signal<Transaction[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly page = signal(1);
  readonly size = 10;

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list({ page: this.page(), size: this.size }).subscribe({
      next: res => {
        this.items.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.message || 'Request failed');
        this.loading.set(false);
      },
    });
  }

  next() { this.page.update(n => n + 1); this.load(); }
  prev() { this.page.update(n => Math.max(1, n - 1)); this.load(); }

  addRandom() {
    this.api.create({
      account: 'ACC-999',
      counterparty: 'Dynamic Corp',
      amount: Math.round(Math.random() * 5000),
      currency: 'EUR',
      status: 'pending',
    }).subscribe(() => this.load());
  }
}
