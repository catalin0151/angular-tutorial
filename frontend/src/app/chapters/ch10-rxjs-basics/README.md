# Chapter 10 — RxJS basics

**Goal:** Learn the handful of RxJS pieces you'll actually use in Angular 20+. Not the whole library — just enough to handle search debouncing, request cancellation, interval-driven updates, and signal interop.

---

## ⚠️ Prerequisites

Reuses `TransactionsService` from Chapter 09, so same requirements:

1. **Backend running** (`npm run dev` in `backend/`).
2. **Logged in** — this chapter is gated with `authGuard`. Log in via Chapter 15 first.

Without these, the page bounces to the login screen.

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

### The operators you need daily

```ts
import { map, filter, debounceTime, distinctUntilChanged, switchMap, catchError, tap, take, startWith } from 'rxjs';

source$.pipe(
  map(x => x * 2),              // transform each value
  filter(x => x > 10),          // skip some values
  debounceTime(300),            // emit only after 300ms of silence
  distinctUntilChanged(),       // skip consecutive repeats
  tap(x => console.log(x)),     // side effect, doesn't change the value
  startWith(''),                // emit a value immediately before the source starts
  take(5),                      // take the first 5 values, then complete
  switchMap(x => http.get(x)),  // flatten + CANCEL previous inner observable
  catchError(err => of(null)),  // recover from errors
);
```

- **`map`/`filter`** — like array methods but for streams.
- **`debounceTime(ms)`** — wait for a quiet period before emitting. Classic use: search input.
- **`distinctUntilChanged`** — don't fire if consecutive values are equal.
- **`tap`** — run a side effect (log, fire-and-forget) without changing the stream. Great for debugging a pipeline.
- **`startWith(initial)`** — emit `initial` immediately on subscribe, then continue with the source. Common with `valueChanges` so the current value flows the moment you connect.
- **`take(n)`** — take first `n` emissions, then complete. Useful for "one-shot" observables or capping an `interval`.
- **`switchMap`** — map to a new observable AND cancel the previous. Classic use: search. See the full "flattening operators" table below.
- **`catchError`** — recover from an error. Return another observable (often `of(fallback)`).

### Flattening operators — pick the right one

When your `map` returns an Observable (an HTTP call, a timer, another stream), you need to **flatten** — subscribe to the inner Observable and expose its values on the outer stream. Four operators, each handles overlap differently:

| Operator | What it does with in-flight inner observables | Use case |
|---|---|---|
| `switchMap` | **Cancels** the old one when a new value arrives | **Search box** — the old query result is irrelevant |
| `mergeMap` | Runs **all** in parallel, interleaves results | **Fire-and-forget uploads** — want them all to run |
| `concatMap` | **Queues** — runs them strictly in order, one at a time | **Save-on-every-edit** — must preserve order |
| `exhaustMap` | **Ignores** new values while one is in-flight | **Submit button** — prevent double-clicks |

Pick carefully — using `mergeMap` on a search box is the classic bug where out-of-order responses overwrite fresh ones with stale data.

### Subjects — producing your own observables

`HttpClient` and `valueChanges` hand you observables. Sometimes you need to **create** one — a service that exposes "notification" events, a cross-component event bus. That's what `Subject` is for.

```ts
import { Subject, BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _events = new Subject<string>();

  readonly events$ = this._events.asObservable();   // consumers subscribe to this

  notify(msg: string) {
    this._events.next(msg);   // fires a value to all current subscribers
  }
}
```

Three subject flavors:

| Type | Behavior |
|---|---|
| `Subject<T>` | Emit values; late subscribers miss past values. For pure events. |
| `BehaviorSubject<T>` | Holds a **current value**; late subscribers immediately get the latest. State-like. |
| `ReplaySubject<T>(n)` | Buffers the last `n` emissions and replays to late subscribers. |

**Modern Angular caveat:** `BehaviorSubject<T>` has largely been **replaced by signals** for state. Use signals for the state, keep `Subject` for genuine event streams (toast notifications, "user logged out" broadcast, inter-component messages).

### `combineLatest` — merge multiple streams into one

When your HTTP call depends on **two** inputs (search text + status filter), `combineLatest` gives you one observable that fires whenever either input changes:

```ts
import { combineLatest } from 'rxjs';

const stream$ = combineLatest([
  toObservable(this.search),
  toObservable(this.status),
]).pipe(
  debounceTime(300),
  switchMap(([q, status]) => this.api.list({ q, status })),
);
```

Fires only when **both** have emitted at least once. The emitted value is a tuple of the latest from each source.

**The signals equivalent is `computed(() => [this.search(), this.status()])`** — but `combineLatest` is still what you'll use when the sources are observables (`valueChanges` etc.).

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

### Recipe: search-as-you-type with a signal input + debounce + HTTP

This is the canonical "why RxJS still matters" pattern. The user types in a text box, you want to call the API — but **not** on every keystroke, and **not** with out-of-order results. Five operators do the whole job.

**The flow you're building:**

```
user types → input event → signal.set(value) → toObservable → debounce 300ms
  → skip repeats → cancel previous request → HTTP call → toSignal → template
```

**Full component:**

```ts
import { Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';
import { TransactionsService } from '../ch09-http-backend/transactions.service';

@Component({
  selector: 'app-search-demo',
  template: `
    <input
      type="text"
      [value]="query()"
      (input)="query.set($any($event.target).value)"
      placeholder="search account…"
    />

    @if (results(); as res) {
      <p>{{ res.total }} matches</p>
      <ul>
        @for (tx of res.items; track tx.id) {
          <li>{{ tx.account }} — {{ tx.amount }}</li>
        }
      </ul>
    } @else {
      <p>Start typing to search…</p>
    }
  `,
})
export class SearchDemo {
  private readonly api = inject(TransactionsService);

  readonly query = signal('');

  readonly results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(300),                                         // 1
      distinctUntilChanged(),                                    // 2
      switchMap(q =>                                             // 3
        q.trim().length < 2
          ? of(null)                                             // 4
          : this.api.list({ search: q, page: 1, size: 10 }).pipe(
              catchError(() => of(null))                         // 5
            )
      ),
    ),
    { initialValue: null }
  );
}
```

**Line by line:**

1. **`debounceTime(300)`** — wait 300ms of silence before emitting. If the user types `a-b-c` fast, only one emission fires (with `'abc'`), not three. This is where you kill the keystroke spam.
2. **`distinctUntilChanged()`** — if the latest value equals the previous (user typed, deleted, re-typed the same thing), skip. Prevents redundant requests.
3. **`switchMap(q => ...)`** — for each new query, start a new HTTP observable AND **cancel the previous one** if it's still in flight. This is what prevents out-of-order responses: user types `a` → request fires → user types `ab` before the first comes back → the `a` request is cancelled, you only ever see the `ab` response.
4. **Short-circuit for tiny queries** — returning `of(null)` means "emit `null` immediately, don't call the API." Requiring 2+ chars avoids firing on every single keystroke when the user has just started.
5. **`catchError(() => of(null))` INSIDE the switchMap** — a failed request becomes `null` instead of killing the outer stream. If it were outside, one error would terminate the whole pipeline and the search box would stop working. **Placement matters a lot here.**

**What the user sees:**
- Type `a` → nothing happens (short-circuited).
- Type `ab` → 300ms later, one request fires.
- Keep typing `abc` → the `ab` request gets cancelled mid-flight, a fresh `abc` one fires.
- Stop typing → 300ms later, results appear.
- Delete everything → `distinctUntilChanged` skips the repeat if you were already on `''`; results clear via the short-circuit's `null`.

**Variations you'll do in real projects:**

- **Multiple inputs** → wrap each in `toObservable` and `combineLatest` them (see Chapter 13's data grid — search + status + sort + page all funnel into one pipeline).
- **Show "loading…"** → add a sibling `loading` signal; set it `true` inside `tap` right before the API call, `false` in a second `tap` on success:
  ```ts
  switchMap(q => {
    this.loading.set(true);
    return this.api.list({ search: q }).pipe(
      tap({ next: () => this.loading.set(false), error: () => this.loading.set(false) }),
      catchError(() => of(null)),
    );
  })
  ```
- **Preserve old results while loading** → don't return `of(null)` on error; return `of(previousResults)` so the UI doesn't flash to empty. More code; often worth it.
- **With a reactive form** → replace `signal` + `(input)` with `FormControl` + `this.control.valueChanges` (no `toObservable` needed; `valueChanges` IS an observable). Common in ch08-style forms.

**Why `signal + toObservable` instead of raw RxJS Subjects:**

The signal is the **source of truth** — your template binds to it directly, your handlers `.set()` it, and you can read it synchronously anywhere with `.query()`. You bridge to observables **only for the pipeline part**, then come back to a signal for display. One mental model (signals) everywhere except the stream-shaped middle.

### When to convert — signal ↔ FormControl ↔ Observable

Real components mix all three: signals for UI state, FormControls for form inputs, Observables for HTTP. The question "when do I convert one to the other?" has a surprisingly clean answer once you know the rules.

#### The three sources you'll meet

| Source | What it already is | Current value | Emits on subscribe/read |
|---|---|---|---|
| **Signal** (`signal()`, `input()`, `computed()`) | Signal | Yes (always) | Yes, synchronously |
| **FormControl / FormGroup** | Object with `.value` + `valueChanges` Observable | Yes (via `.value`) | No — `valueChanges` only fires on change |
| **HTTP / Router / event streams** | Observable | No (just a stream) | Depends on the observable |

#### The core rules

1. **Pipelines must be built from Observables.** `combineLatest`, `switchMap`, `debounceTime`, `catchError` — all RxJS operators consume Observables, not signals. **If you want to pipe through operators, you must have an Observable at that stage.**
2. **Templates and consumers want Signals.** Templates read signals naturally (`{{ foo() }}`). Other signals and `computed`s subscribe to them automatically. **Pipeline output should almost always be a signal**, obtained via `toSignal`.
3. **The FormControl is already a source of truth.** It has both `.value` (synchronous) and `.valueChanges` (Observable). Don't duplicate it into a signal unless something *else* needs to read it reactively.

#### Decision flow

For each component, ask in order:

1. **What are my sources?** (signals, FormControls, HTTP calls, router params)
2. **What does the pipeline need to do?** If it needs multiple sources, debounce, cancellation, or combining — you need an RxJS pipeline.
3. **What does the output feed?** If it's a template or a computed — convert the end to a signal.
4. **For each source, how do I get it into Observable form?**
   - Signal → `toObservable(sig)` (emits current value on subscribe)
   - FormControl → use `.valueChanges` directly (needs `startWith(ctrl.value)` for `combineLatest`)
   - Already an Observable → use as-is

#### Common patterns, side by side

**Pattern A — Pure signals, no pipeline needed:**
```ts
readonly a = signal(1);
readonly b = signal(2);
readonly sum = computed(() => this.a() + this.b());
```
No conversion. `computed` combines signals automatically. Use when you just need derived values with no I/O or time-based logic.

**Pattern B — Signal driving HTTP with request cancellation:**
```ts
readonly userId = signal(1);
readonly user = toSignal(
  toObservable(this.userId).pipe(switchMap(id => this.api.get(id))),
  { initialValue: null }
);
```
Convert signal → observable to use `switchMap`, then back to signal for the template.

**Pattern C — FormControl driving HTTP with debounce:**
```ts
readonly form = new FormGroup({ search: new FormControl('', { nonNullable: true }) });

readonly results = toSignal(
  this.form.controls.search.valueChanges.pipe(
    startWith(this.form.controls.search.value),
    debounceTime(300),
    switchMap(q => this.api.list({ search: q })),
  ),
  { initialValue: null }
);
```
FormControl stays as-is — its `valueChanges` is already an Observable. Don't convert the control to a signal unless you need to read `search()` elsewhere. One less link in the chain.

**Pattern D — FormControl + signal combined (ch13 data-grid pattern):**
```ts
readonly form = new FormGroup({ search: new FormControl('', { nonNullable: true }) });
readonly page = signal(1);

readonly results = toSignal(
  combineLatest([
    this.form.controls.search.valueChanges.pipe(
      startWith(this.form.controls.search.value),
      debounceTime(300),
    ),
    toObservable(this.page),
  ]).pipe(
    switchMap(([search, page]) => this.api.list({ search, page })),
  ),
  { initialValue: null }
);
```
Both sources converted to Observable form (FormControl via `valueChanges`, signal via `toObservable`). Combined with `combineLatest`. Output back to signal via `toSignal`.

**Pattern E — one-shot read, no pipeline:**
```ts
save() {
  const current = this.form.controls.search.value;   // or this.somesignal()
  this.api.save(current).subscribe(...);
}
```
No conversion needed. Read the source synchronously inside the handler.

#### When to ALSO expose a form field as a signal

```ts
readonly search = toSignal(
  this.form.controls.search.valueChanges,
  { initialValue: this.form.controls.search.value }
);
```

**Only add this if** something else wants to read `search()` as a signal:
- Template reads `{{ search() }}` elsewhere
- A `computed()` depends on it
- Another `effect()` wants to react to it

If the only consumer is the pipeline, skip it — use `valueChanges` directly.

#### Anti-patterns to avoid

**1. Mirror signal that duplicates FormControl state:**
```ts
// ❌ Two sources of truth
readonly form = new FormGroup({ search: new FormControl('') });
readonly search = signal('');

onSearchChange(v) {
  this.form.controls.search.setValue(v);
  this.search.set(v);               // easy to forget, now they disagree
}

// ✅ One source, derive the other
readonly form = new FormGroup({ search: new FormControl('') });
readonly search = toSignal(this.form.controls.search.valueChanges, { initialValue: '' });
```

**2. Round-trip signal → observable → signal with no middle use:**
```ts
// ❌ Needless indirection
readonly search = toSignal(this.form.controls.search.valueChanges, { initialValue: '' });
toObservable(this.search).pipe(debounceTime(300), switchMap(...))

// ✅ Use valueChanges directly if the signal has no other consumer
this.form.controls.search.valueChanges.pipe(
  startWith(this.form.controls.search.value),
  debounceTime(300),
  switchMap(...)
)
```

**3. Converting for one-shot reads:**
```ts
// ❌ Overkill — you're just reading once in a handler
readonly search = toSignal(this.form.controls.search.valueChanges, { initialValue: '' });
submit() { this.api.save(this.search()).subscribe(...); }

// ✅ Just read the FormControl directly
submit() { this.api.save(this.form.controls.search.value).subscribe(...); }
```

**4. Reading a signal inside an RxJS operator callback and expecting tracking:**
```ts
// ❌ Signal read inside pipe is NOT tracked
toObservable(this.a).pipe(
  map(aVal => aVal + this.b())    // b() is a one-time read, not tracked
)

// ✅ Bring b into the pipeline
combineLatest([toObservable(this.a), toObservable(this.b)]).pipe(
  map(([a, b]) => a + b)
)
```

Signal tracking only works inside `computed`, `effect`, and template bindings. Inside RxJS operator callbacks, signal calls are plain reads, not subscriptions.

#### Rule of thumb for your workflow

**Start with the output. What does the template need?** A signal. That tells you the pipeline ends in `toSignal`. Then work backwards: what sources feed it, what each source's native form is, convert only at the boundaries.

**TL;DR:**
- Templates and consumers want **signals** → `toSignal` at the END of the pipeline.
- RxJS operators want **observables** → `toObservable` or `valueChanges` at the START of the pipeline.
- **Don't duplicate state.** FormControl IS state, signal IS state. Don't wrap one in the other unless a consumer needs the other form.
- **One-shot reads need no conversion.** Call `signal()` or read `ctrl.value` directly.
- **A `toSignal` bridge is cheap** and sometimes earns its keep by making the value usable in the template or a computed.

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

### Exercise 1 — filter the search pipeline + minimum query length

**Theory you need:** *The operators you need daily (`filter`, `tap`)*.

The chapter's search pipeline fires on every keystroke. Change it so the API is only called when `q.length >= 2`. Also add a `tap(q => console.log('searching for', q))` so you can watch the pipeline in the console.

- **Hint:** add both operators **before** `switchMap`:
  ```ts
  debounceTime(300),
  distinctUntilChanged(),
  filter(q => q.length >= 2),
  tap(q => console.log('searching for', q)),
  switchMap(q => ...)
  ```
- **What good looks like:** type one char → no API call, no log. Type a second → both happen. Open the Network tab to confirm.
- **Try also:** swap `filter` with `takeWhile(q => q.length >= 2)` and watch the stream **complete** after the first short value — not what you want. Confirms the "filter vs takeWhile" difference.

### Exercise 2 — combine two inputs with `combineLatest`

**Theory you need:** *`combineLatest`*, *Signal ↔ Observable interop*.

Add a status `<select>` next to the search input (`all` / `pending` / `cleared` / `failed`). Build a pipeline that **re-runs the API call whenever either input changes** — the search text OR the status.

- **Hint:** two signals (`search`, `status`), then:
  ```ts
  readonly results = toSignal(
    combineLatest([toObservable(this.search), toObservable(this.status)]).pipe(
      debounceTime(300),
      switchMap(([q, status]) =>
        this.api.list({ page: 1, size: 10, account: q, status: status === 'all' ? undefined : status })
      ),
    ),
    { initialValue: null }
  );
  ```
- **What good looks like:** changing EITHER the search or the dropdown re-fetches. Watch the Network tab to confirm you're not making two overlapping requests on a single change.
- **Why this matters at the DB job:** every filter panel in the DB app will be a `combineLatest` of 3–6 inputs feeding one query. This is **the** real-world RxJS pattern.

### Exercise 3 — `NotificationService` with a `Subject`

**Theory you need:** *Subjects*, *Signal ↔ Observable interop*.

Create a service `notification.service.ts` that exposes a `Subject<string>` for toast-style messages. Any component can call `notify('something happened')` and anyone subscribing to `events$` receives it.

Then in `ch10-rxjs-basics.ts`, subscribe (with `takeUntilDestroyed`) and display the latest message in a `<p>` above the search.

- **Hint:** service:
  ```ts
  @Injectable({ providedIn: 'root' })
  export class NotificationService {
    private readonly _events = new Subject<string>();
    readonly events$ = this._events.asObservable();
    notify(msg: string) { this._events.next(msg); }
  }
  ```
  Component:
  ```ts
  readonly lastMessage = toSignal(this.notifications.events$, { initialValue: '' });
  ```
  Add a button that calls `this.notifications.notify('hello at ' + new Date().toISOString())`.
- **What good looks like:** click the button → message appears above the search. Click again → it updates. This proves the Subject-based event bus works.
- **Why `Subject` and not a signal:** signals represent **state** (a current value). A notification is an **event** (something that happened once). If you used a signal, every subscriber would see the current message forever — including late subscribers that mounted after the event fired. `Subject` fires once and moves on, which is what you want for events.

### Exercise 4 — stretch — poll the API every 5 seconds

**Theory you need:** *The operators (`switchMap`, `startWith`)*, *`toSignal`*.

Build a polling observable that re-fetches page 1 of transactions every 5 seconds and exposes the count as a signal. Add `startWith(0)` so the first fetch happens immediately, not after a 5-second wait.

- **Hint:**
  ```ts
  readonly pollCount = toSignal(
    interval(5000).pipe(
      startWith(0),
      switchMap(() => this.api.list({ page: 1, size: 10 })),
      map(res => res.total),
    ),
    { initialValue: 0 }
  );
  ```
- **What good looks like:** open two browser tabs on the chapter 09 page and the chapter 10 page. Add a row in chapter 09 → within 5s the counter in chapter 10 ticks up.
- **Watch for:** every component instance with this pipeline fires its own poll. For app-wide live data, build it in a **service** and expose the signal — one poll serves everyone.

---

## 6. Pitfalls

- **Forgot to unsubscribe.** Memory leak + ghost logic running after component destroyed. Pipe through `takeUntilDestroyed()`.
- **Used `mergeMap` where you wanted `switchMap`.** `mergeMap` runs every inner observable in parallel. For search, that means stale responses can overwrite fresh ones. `switchMap` cancels — almost always what you want.
- **Called `.subscribe()` inside a `computed`.** Breaks reactivity and leaks. If a value comes from an observable and you want it in a signal, use `toSignal`.
- **Not typing the pipeline.** `source$.pipe(map(x => ...))` loses types if `source$` isn't typed. Always type the source observable.
- **Nesting `.subscribe()` inside `.subscribe()`.** Pyramid of doom. Use `switchMap` or `concatMap` to chain.
- **Subscribing to the same cold observable twice.** `http.get(url)` is **cold** — each `.subscribe()` fires a new request. Two subscribers = two requests. Use `shareReplay(1)` (or a signal) if you need one request with multiple consumers.
- **`combineLatest` that never fires.** Each source must emit **at least once** before `combineLatest` emits. If one is a `Subject` with no initial value, the whole thing stays silent. Prepend `startWith(initial)` or use `BehaviorSubject`.
- **`BehaviorSubject` for pure events.** Late subscribers get the last-emitted value, which for a one-off event ("saved successfully") means delayed subscribers see stale "success." Use `Subject` (no replay) for events, `BehaviorSubject` only for state.
- **Using signals when you should use RxJS.** Debounce, throttle, polling, request cancellation — these are time-based and stream-shaped. Trying to build them with `effect` and timers gets ugly fast. Signals for state; RxJS for pipelines.
- **Mixing `takeUntilDestroyed()` and manual `takeUntil(subject)`.** Pick one per subscription. Mixing both makes cleanup non-obvious.
- **Reading `signal()` inside an observable pipeline.** Inside a `pipe(map(...))` callback, calling `this.mySignal()` doesn't subscribe to it — you just read whatever value it has at that instant. Convert the signal to an observable with `toObservable` and bring it into the pipeline properly.
