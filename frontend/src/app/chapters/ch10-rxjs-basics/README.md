# Chapter 10 — RxJS basics

**Goal:** Learn the handful of RxJS pieces you'll actually use in Angular 20+. Not the whole library — just enough to handle search debouncing, request cancellation, interval-driven updates, and signal interop.

---

## 1. Theory

### Why RxJS still matters in a signals world

Signals replace a lot of what RxJS used to do (holding state, computing values). But some things remain naturally stream-shaped:
- **HTTP** returns Observables.
- **Form `valueChanges`** are Observables.
- **DOM events** can be modeled as streams.
- **Any time-based logic** (debounce, throttle, retry, polling).

For those, RxJS is still the right tool. For everything else, prefer signals.

### Observables in 60 seconds

An `Observable<T>` is a producer of 0+ values over time. You subscribe to receive them. Three callbacks: `next`, `error`, `complete`.

```ts
import { of, interval } from 'rxjs';

of(1, 2, 3).subscribe(v => console.log(v));   // emits 1, 2, 3, then completes

interval(1000).subscribe(n => console.log(n)); // emits 0, 1, 2… forever
```

### The 6 operators you need daily

```ts
import { map, filter, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs';

source$.pipe(
  map(x => x * 2),              // transform each value
  filter(x => x > 10),          // skip some values
  debounceTime(300),            // emit only after 300ms of silence
  distinctUntilChanged(),       // skip repeats
  switchMap(x => http.get(x)),  // flatten + CANCEL previous inner observable
  catchError(err => of(null)),  // recover from errors
);
```

- **`map`/`filter`** — like array methods but for streams.
- **`debounceTime(ms)`** — wait for a quiet period before emitting. Classic use: search input.
- **`distinctUntilChanged`** — don't fire if the value hasn't changed.
- **`switchMap`** — map to a new observable AND cancel the previous. Classic use: "the user typed something new, cancel the old search request." The one operator that will save you from race conditions.
- **`catchError`** — recover from an error. Return another observable (often `of(fallback)`).

### Subscriptions — the memory leak trap

Every `.subscribe()` leaks memory if you never unsubscribe (for long-lived observables). The fix:

```ts
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interval(1000).pipe(takeUntilDestroyed()).subscribe(...);
```

`takeUntilDestroyed()` auto-cleans when the component is destroyed. **Use it on every long-lived subscription** in a component or service.

For HTTP calls (which complete after one response), unsubscribe isn't required — the observable self-terminates. But using `takeUntilDestroyed()` anyway doesn't hurt.

### Signal ↔ Observable interop

```ts
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

// Observable → Signal (great for display)
readonly tick = toSignal(interval(1000), { initialValue: 0 });

// Signal → Observable (great for feeding into RxJS pipelines)
readonly results = toSignal(
  toObservable(this.search).pipe(
    debounceTime(300),
    switchMap(q => this.api.list({ ... })),
  ),
  { initialValue: null }
);
```

**Rule of thumb:**
- Use signals for state and template reads.
- Use observables for pipelines (debounce, HTTP, event streams).
- Bridge with `toSignal` / `toObservable` where they meet.

### `firstValueFrom` and `lastValueFrom` — await an observable

```ts
import { firstValueFrom } from 'rxjs';

async loadUser(id: number) {
  const user = await firstValueFrom(this.http.get<User>(`/api/users/${id}`));
  return user;
}
```

Use these in `async`/`await` code. **Not `toPromise()`** — that was deprecated.

---

## 2. Why files are named/structured this way

Nothing new. The chapter reuses `TransactionsService` from ch09.

---

## 3. Angular / Vue 2 / React parallel

| Angular | Vue 2 | React |
|---|---|---|
| Observable | event bus or manual subscriptions | custom hook with `useEffect` |
| `debounceTime(300)` | lodash `_.debounce` | lodash or `useDebounce` hook |
| `switchMap` + HTTP | manual "ignore stale response" flag | AbortController + fetch |
| `toSignal` / `toObservable` | n/a | n/a |
| `takeUntilDestroyed` | `beforeDestroy` cleanup | `useEffect` cleanup return |

RxJS is Angular-specific muscle. Vue/React use targeted libs for each use case; Angular ships one toolkit for all of them.

---

## 4. Walkthrough

- `ch10-rxjs-basics.ts` — three demos: `interval` → signal, long-lived subscribe with `takeUntilDestroyed`, debounced search with `switchMap`.
- The search field triggers a mock API call after 300ms of silence. Rapid typing cancels in-flight requests.
- Open DevTools console to watch the periodic logs.

---

## 5. Exercises

### Exercise 1 — stop the tick at 10
Add a `take(10)` so the interval signal stops at 10. Verify the number stops incrementing in the UI.

### Exercise 2 — filter search by minimum length
Change the search pipeline so the API is only called when the search string length ≥ 2. Hint: `filter(q => q.length >= 2)` before `switchMap`.

### Exercise 3 — error recovery with catchError
If the API throws, return a signal of `{ items: [], total: 0 }` instead of null. Use `catchError(() => of({ items: [], total: 0, page: 1, size: 10 }))`.

### Exercise 4 — stretch — a polling observable
Use `interval(5000)` combined with `switchMap` to re-fetch the first page of transactions every 5 seconds. Convert to a signal. Verify in the UI that counts update when you add a row via the ch09 page.

---

## 6. Pitfalls

- **Forgot to unsubscribe.** Memory leak + ghost logic running after component destroyed. Pipe through `takeUntilDestroyed()`.
- **Used `mergeMap` where you wanted `switchMap`.** `mergeMap` runs every inner observable in parallel. For search, that means stale responses can overwrite fresh ones. `switchMap` cancels — almost always what you want.
- **Called `.subscribe()` inside a `computed`.** Breaks reactivity and leaks. If a value comes from an observable and you want it in a signal, use `toSignal`.
- **Not typing the pipeline.** `source$.pipe(map(x => ...))` loses types if `source$` isn't typed. Always type the source observable.
- **Nesting `.subscribe()` inside `.subscribe()`.** Pyramid of doom. Use `switchMap` or `concatMap` to chain.
