import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, debounceTime, switchMap } from 'rxjs';
import { TransactionsService, Transaction } from '../ch09-http-backend/transactions.service';

type SortKey = keyof Pick<Transaction, 'id' | 'date' | 'account' | 'amount' | 'status'>;

@Component({
  selector: 'app-ch13-data-grid',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './ch13-data-grid.html',
  styleUrl: './ch13-data-grid.css',
})
export class Ch13DataGrid {
  private readonly api = inject(TransactionsService);

  readonly search  = signal('');
  readonly status  = signal<'all' | 'pending' | 'cleared' | 'failed'>('all');
  readonly sort    = signal<SortKey>('date');
  readonly dir     = signal<'asc' | 'desc'>('desc');
  readonly page    = signal(1);
  readonly size    = 10;

  readonly response = toSignal(
    combineLatest([
      toObservable(this.search),
      toObservable(this.status),
      toObservable(this.sort),
      toObservable(this.dir),
      toObservable(this.page),
    ]).pipe(
      debounceTime(200),
      switchMap(([q, status, sort, dir, page]) =>
        this.api.list({
          page,
          size: this.size,
          account: q || undefined,
          status: status === 'all' ? undefined : status,
          sort,
          dir,
        })
      ),
    ),
    { initialValue: null }
  );

  readonly items = computed(() => this.response()?.items ?? []);
  readonly total = computed(() => this.response()?.total ?? 0);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.size)));
  readonly loading = computed(() => this.response() === null);

  setSort(key: SortKey) {
    if (this.sort() === key) {
      this.dir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(key);
      this.dir.set('asc');
    }
    this.page.set(1);
  }

  onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  onStatus(event: Event) {
    this.status.set((event.target as HTMLSelectElement).value as any);
    this.page.set(1);
  }

  prev() { this.page.update(p => Math.max(1, p - 1)); }
  next() { this.page.update(p => Math.min(this.totalPages(), p + 1)); }
}
