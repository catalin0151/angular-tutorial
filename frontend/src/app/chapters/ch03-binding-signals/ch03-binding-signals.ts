import { Component, signal, computed, effect } from '@angular/core';
import { DecimalPipe } from '@angular/common';

interface Transaction {
  id: number;
  account: string;
  amount: number;
  status: 'pending' | 'cleared' | 'failed';
}

@Component({
  selector: 'app-ch03-binding-signals',
  imports: [DecimalPipe],
  templateUrl: './ch03-binding-signals.html',
  styleUrl: './ch03-binding-signals.css',
})
export class Ch03BindingSignals {
  // --- Counter demo: signal + .update ---
  readonly count = signal(0);
  readonly doubled = computed(() => this.count() * 2);

  increment() { this.count.update(n => n + 1); }
  decrement() { this.count.update(n => n - 1); }
  reset() { this.count.set(0); }

  // --- Filter demo: signals + computed + @for + @empty ---
  readonly transactions = signal<Transaction[]>([
    { id: 1, account: 'ACC-001', amount: 1250.00, status: 'cleared' },
    { id: 2, account: 'ACC-002', amount: 820.50, status: 'pending' },
    { id: 3, account: 'ACC-001', amount: -300.00, status: 'cleared' },
    { id: 4, account: 'ACC-003', amount: 5000.00, status: 'failed' },
    { id: 5, account: 'ACC-002', amount: 412.75, status: 'cleared' },
    { id: 6, account: 'ACC-003', amount: 75.00, status: 'pending' },
  ]);

  readonly search = signal(localStorage.getItem('ch03.search') || '');
  readonly statusFilter = signal<'all' | 'pending' | 'cleared' | 'failed'>('all');
  readonly minAmount = signal<number>(0);
  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.transactions().filter(tx => {
      const matchesStatus = status === 'all' || tx.status === status;
      const matchesSearch = !q || tx.account.toLowerCase().includes(q);
      return matchesStatus && matchesSearch && tx.amount > this.minAmount();
    });
  });

  readonly total = computed(() =>
    this.filtered().reduce((sum, tx) => sum + tx.amount, 0)
  );

  // --- Effect demo: side-effect runs when its dependencies change ---
  constructor() {
    effect(() => {
      // runs whenever count() changes
      console.log(`[ch03] count is now ${this.count()}`);
    });
    effect(() => {
      localStorage.setItem('ch03.search', this.search())
    })
    effect((onCleanup) => {
      const id = setInterval(() => console.log(this.count()), 10000);
      onCleanup(() => clearInterval(id));
    });
  }

  onSearchInput(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  onStatusChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as
      'all' | 'pending' | 'cleared' | 'failed';
    this.statusFilter.set(value);
  }

  setMinAmount(event: Event) {
    this.minAmount.set(parseInt((event.target as HTMLInputElement).value) || 0);
  }

  readonly countByStatus = computed(() => {
    let result: Record<string, number> = {}
    this.filtered().forEach((transaction) => {
      let status: string | undefined = transaction?.status;
      if (!status) {
        return;
      }
      if (result[status] === undefined) {
        result[status] = 0
      }
      result[status]++;
    })

    return result;
  })
  readonly countByStatusKeys = computed(() => {
    return Object.keys(this.countByStatus())
  })
}
