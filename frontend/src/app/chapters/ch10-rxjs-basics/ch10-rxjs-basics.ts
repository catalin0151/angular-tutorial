import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, interval, switchMap } from 'rxjs';
import { TransactionsService } from '../ch09-http-backend/transactions.service';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-ch10-rxjs-basics',
  imports: [DecimalPipe],
  templateUrl: './ch10-rxjs-basics.html',
  styleUrl: './ch10-rxjs-basics.css',
})
export class Ch10RxjsBasics {
  private readonly api = inject(TransactionsService);
  private readonly destroyRef = inject(DestroyRef);

  // 1. interval → toSignal
  readonly tick = toSignal(interval(1000), { initialValue: 0 });

  // 2. plain subscribe with takeUntilDestroyed
  constructor() {
    interval(2000).pipe(takeUntilDestroyed()).subscribe(n => {
      console.log('[ch10] every 2s:', n);
    });
  }

  // 3. search box → debounce → switchMap → results
  readonly search = signal('');
  readonly results = toSignal(
    toObservable(this.search).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q =>
        this.api.list({ page: 1, size: 10, account: q.trim() ? undefined : undefined })
      ),
    ),
    { initialValue: null }
  );

  onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }
}
