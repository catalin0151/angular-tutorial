# Chapter 03 — Binding & signals

**Goal:** Build fluency with Angular's reactivity primitives (`signal`, `computed`, `effect`) and cover every piece of the new control flow (`@if`, `@for`, `@switch`, `@defer`, `@let`). After this chapter, "thinking in Angular" should click.

---

## 1. Theory

### Signals — a recap and a few new tricks

Chapter 01 introduced `signal()`. Here's the full writable-signal API in one place:

```ts
const n = signal(0);

n();              // read → 0
n.set(5);         // write a known value
n.update(x => x + 1);   // transform the current value
n.asReadonly();   // return a read-only view (hands this out to consumers you don't want writing)
```

Important mental model:

- **Signals compare with `Object.is`.** If you call `.set(x)` with a value equal to the current one, nothing fires. If you call `.set(sameObject)` without creating a new reference, nothing fires. This is why **arrays and objects need to be replaced immutably** — see the earlier message.
- **Reads are cheap and tracked.** Calling `n()` from inside a `computed` or `effect` registers "this computation depends on `n`." Angular then re-runs it when `n` changes. Reads from a plain method or event handler are just reads — no tracking.

### `computed` — derived, cached, auto-tracked

```ts
const price = signal(10);
const quantity = signal(3);
const total = computed(() => price() * quantity());
```

Rules you'll internalize:

- Reads signals inside the function → **auto-tracks them as dependencies**. No deps array, no `useMemo` ceremony.
- The result is **cached**. The body only re-runs when at least one tracked signal changes.
- The returned value is **read-only** — a `Computed<T>` has `()` but no `.set` / `.update`.
- The body **must be pure** — no `console.log`, no HTTP calls, no mutations. For side effects, use `effect()`.

```ts
total();          // read → 30
total.set(999);   // ❌ compile error — computed has no .set
```

**React parallel:** `useMemo(() => price * quantity, [price, quantity])`. Angular drops the deps array because it tracks them for you.
**Vue 2 parallel:** `computed: { total() { return this.price * this.quantity } }`. Nearly identical — Vue tracks reads of reactive properties the same way.

### `effect` — side effects on signal changes

```ts
constructor() {
  effect(() => {
    console.log('count is now', this.count());
  });
}
```

Rules:

- Reads inside the body are tracked, same as `computed`. Effect re-runs when any dependency changes.
- Runs once immediately on creation, then on every change.
- Use for **side effects**: logging, syncing to `localStorage`, calling imperative DOM APIs, triggering analytics. **Not** for computing values — that's what `computed` is for.
- Must be created in a **DI context** (constructor, field initializer, or inside `inject()`-reachable code). If you need to create one later, pass `{ injector }`.

```ts
constructor() {
  effect(() => {
    localStorage.setItem('search', this.search());   // sync whenever search changes
  });
}
```

**Cleanup:**

```ts
effect((onCleanup) => {
  const id = setInterval(() => console.log(this.count()), 1000);
  onCleanup(() => clearInterval(id));
});
```

Angular calls `onCleanup` before each re-run and when the component is destroyed.

**React parallel:** `useEffect(() => { ... }, [deps])` with cleanup returning a function. Angular auto-tracks deps and gives you `onCleanup` as a callback instead.
**Vue 2 parallel:** `watch` with `immediate: true`. Vue 2 needs you to list the source; Angular tracks it.

### When to pick what — the decision tree

- "I need a value I can change." → **signal**
- "I need a value derived from other signals." → **computed**
- "I need to do something external (log, save, call an API) when a signal changes." → **effect**
- "I need to react to a signal in a template." → just read it: `{{ foo() }}` or `[attr]="foo()"`

Rule of thumb: **you'll write a lot of signals and computeds, and very few effects.** If you catch yourself writing an effect that calls `.set()` on another signal, that's almost always a sign you wanted a `computed` instead.

### The new control flow — the full set

Chapter 01 covered `@if`, `@for`, `@switch` as part of templating. Here's everything, including pieces we haven't shown yet.

#### `@if` with `; as` alias

```html
@if (currentUser(); as user) {
  <p>Welcome, {{ user.name }}!</p>
} @else {
  <p>Please log in.</p>
}
```

The `; as user` captures the truthy value of the condition into a local **inside the block**. Great for narrowing `User | null` to `User` without repeating `currentUser()!.name` everywhere.

#### `@for` with implicit variables

```html
@for (tx of filtered(); track tx.id; let i = $index) {
  <li>{{ i + 1 }}. {{ tx.account }}</li>
}
```

Available implicit variables inside the block:

| Variable  | Meaning                           |
|-----------|-----------------------------------|
| `$index`  | zero-based position               |
| `$first`  | true if first iteration           |
| `$last`   | true if last iteration            |
| `$even`   | true on even indices (0, 2, 4…)   |
| `$odd`    | true on odd indices  (1, 3, 5…)   |
| `$count`  | total length of the collection    |

Rename any of them with `let`:

```html
@for (tx of filtered(); track tx.id; let i = $index, isLast = $last) {
  <li [class.last]="isLast">{{ i + 1 }}. {{ tx.account }}</li>
}
```

#### `@for` with `@empty`

```html
@for (tx of filtered(); track tx.id) {
  <li>{{ tx.account }}</li>
} @empty {
  <li>No results.</li>
}
```

Shows when the collection is empty. Cleaner than `@if (list.length === 0) { ... } @else { @for ... }`.

#### `@switch`

```html
@switch (tx.status) {
  @case ('cleared') { <span class="ok">Cleared</span> }
  @case ('pending') { <span class="pending">Pending</span> }
  @case ('failed')  { <span class="fail">Failed</span> }
  @default          { <span>Unknown</span> }
}
```

- Strict equality (`===`).
- `@default` is optional. No match + no default → nothing renders.
- Use `@switch` for 3+ branches. For 2, `@if`/`@else` reads better.

#### `@defer` — load content lazily

This one's new to Angular 17+ and genuinely useful for data-heavy pages.

```html
@defer (on viewport) {
  <app-heavy-chart />
} @placeholder {
  <div class="skeleton">loading chart…</div>
} @loading (minimum 300ms) {
  <div>loading…</div>
} @error {
  <div>couldn't load</div>
}
```

Triggers you can use instead of `on viewport`:

- `on idle` — browser idle time
- `on timer(2s)` — after a delay
- `on interaction` — when the user clicks/types on the placeholder
- `on hover` — mouse enters the placeholder
- `when (condition)` — a dynamic boolean (usually a signal)

**Why this matters at the job:** data-heavy dashboards love `@defer` for charts, grids, and secondary panels that don't need to render immediately. Smaller initial bundle, faster first paint.

#### `@let` — a local variable inside the template

```html
@let count = filtered().length;
<p>Showing {{ count }} items</p>
<small>({{ count === 0 ? 'none' : count + ' total' }})</small>
```

Scoped to the current block. Great for:
- Reading the same signal twice without visual noise (`filtered().length` repeated).
- Narrowing types (same role as `@if ... as`).
- Named intermediate computations too small to deserve a `computed` in the class.

**No equivalent in older Angular** — `@let` landed in v18. If you see helper methods or getters just to produce a one-off value for the template, those can usually be collapsed into `@let`.

### Pipes — formatting values in templates

Pipes transform a value before display. You pipe values through them with `|`:

```html
<p>{{ 1234.5 | number:'1.2-2' }}</p>   <!-- 1,234.50 -->
<p>{{ price | currency:'USD' }}</p>    <!-- $19.99 -->
<p>{{ date | date:'yyyy-MM-dd' }}</p>  <!-- 2026-10-22 -->
<p>{{ list | json }}</p>               <!-- debug: pretty JSON -->
<p>{{ name | uppercase }}</p>          <!-- ALICE -->
<p>{{ longText | slice:0:50 }}…</p>    <!-- first 50 chars -->
```

Pipes are provided by `@angular/common` and **must be imported** in the component's `imports`:

```ts
import { DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';

@Component({ imports: [DecimalPipe, CurrencyPipe, DatePipe], ... })
```

Covered in detail in Chapter 04. For this chapter we just use `number:'1.2-2'` ("at least 1 integer digit, 2–2 decimal digits").

**Vue 2 parallel:** Vue 2 had `{{ value | filter }}` filters with similar syntax. **Removed in Vue 3**, Angular kept the pattern.
**React parallel:** nothing built-in; you'd use plain functions like `formatNumber(value)` in JSX.

---

## 2. Why files are named/structured this way

Nothing new in this chapter — the component sits alone in its folder because it doesn't have child components. If it grew, we'd nest children (e.g., a `TransactionRow` component) under this folder, as we did in Chapter 02.

Pattern worth internalizing from this chapter: when a template needs a derived value that uses two or more signals (like `filtered` from `search`, `statusFilter`, and `transactions`), **always reach for `computed`**, not a method and not a getter. Method/getter calls in `{{ }}` run on every change detection cycle; computed caches.

---

## 3. Angular / Vue 2 / React parallel

| Angular | Vue 2 equivalent | React equivalent | Notes |
|---|---|---|---|
| `signal(0)` + `.set` / `.update` | `data() { return { n: 0 } }` + `this.n = ...` | `useState(0)` + `setN(...)` | Vue mutates directly; React and Angular both go through a setter. Angular reads with `n()`. |
| `computed(() => a() + b())` | `computed: { sum() { return this.a + this.b } }` | `useMemo(() => a + b, [a, b])` | Vue and Angular both auto-track; React needs an explicit deps array. |
| `effect(() => { ... })` | `watch: { search(v) { ... } }` (per-source) or `watchEffect` (Vue 3) | `useEffect(() => { ... }, [deps])` | Angular tracks deps automatically. Vue 2 names the source; Vue 3's `watchEffect` matches Angular's model. |
| `@if (x; as y) { ... }` | `v-if="x"` (no `as`) | `{x && <A/>}` | Angular's `as` for narrowing has no Vue 2 equivalent — closest is `v-if="x" :key="x"` + binding. |
| `@for (t of list; track t.id)` | `v-for="t in list" :key="t.id"` | `.map(t => <X key={t.id}/>)` | `track` ↔ `:key` ↔ `key`. Angular makes it required and compile-fails if missing. |
| `@empty { ... }` on `@for` | manual `v-if="list.length === 0"` | manual check | Angular built it in; the others don't. |
| `@switch`/`@case` | `v-if`/`v-else-if` chain | `switch` inside the component function | Angular has first-class template syntax; the others improvise. |
| `@defer (on viewport)` | plain `v-if` + manual IntersectionObserver | `React.lazy` + `Suspense` + manual visibility | Angular bundles bundle-splitting + visibility trigger into one directive. No clean Vue 2 equivalent. |
| `@let x = filtered().length` | computed property or inline in template | `const x = ...; return <... />` | Angular templates don't have JS-level locals; `@let` fills that gap. |
| `{{ 1234 | number:'1.2-2' }}` | `{{ 1234 | number }}` (Vue 2 filters) | `formatNumber(1234)` from a util | Vue 3 removed filters; Angular pipes do the same job. |

**Where Angular differs sharply from Vue 2:**
- Signal reads need `()`. Vue 2 reads `this.n` directly.
- Immutability is enforced for arrays/objects — no `this.users.push(...)`. Vue 2 mutations work fine.
- `effect` tracks sources automatically; Vue 2's `watch` makes you name them.

---

## 4. Walkthrough — read the files I wrote

Open these in order:

1. **`ch03-binding-signals.ts`** — three demos in one class:
   - **Counter:** `count` signal, `doubled` computed, `.update(n => n + 1)` in handlers.
   - **Filter:** `transactions` + `search` + `statusFilter` signals, `filtered` computed that reads all three, `total` computed derived from `filtered`.
   - **Effect:** logs to console whenever `count()` changes. Open DevTools before clicking the counter to see it fire.
2. **`ch03-binding-signals.html`** — three cards:
   - Counter card with increment/decrement/reset.
   - Filter card using `@for`/`@empty`/`@switch`/`@let` + the `number` pipe.
   - `@defer` card that only renders when scrolled into view (scroll down to trigger).
3. **`ch03-binding-signals.css`** — layout only, nothing instructive.

Open http://localhost:4200/ch03-binding-signals, open DevTools console, click the counter, type in the search box, change the status, scroll to the defer card.

---

## 5. Exercises

### Exercise 1 — add a "min amount" filter

**Theory you need:** *Signals*, *`computed`*, Chapter 01's *form bindings → number input*.

Add a signal `minAmount = signal(0)` and a `<input type="number">` bound to it in the controls row. Update `filtered` so transactions below `minAmount()` are hidden.

- Remember to cast with `+` for the number input: `minAmount.set(+(...))`.
- **What good looks like:** typing `1000` filters down to just the two biggest transactions. Setting it back to `0` shows everything the account/status filters allow.

### Exercise 2 — count by status

**Theory you need:** *`computed`*, *`@for`* with `let $index`.

Add a `computed` called `countsByStatus` that returns an object `{ pending: n, cleared: n, failed: n }` of the counts from `transactions()`. Show them as three badges above the list.

Starter:
```ts
readonly countsByStatus = computed(() => {
  const result = { pending: 0, cleared: 0, failed: 0 };
  for (const tx of this.transactions()) {
    result[tx.status]++;
  }
  return result;
});
```

- **What good looks like:** three static badges showing the overall counts. They never change (since `transactions` is static), but if you added a transaction they'd update automatically.
- **Bonus:** make them clickable — clicking a badge sets `statusFilter` to that value.

### Exercise 3 — persist search to localStorage

**Theory you need:** *`effect`*.

Use an `effect` in the constructor to save `search()` to `localStorage` whenever it changes. In the field initializer for `search`, read any saved value on load:

```ts
readonly search = signal(localStorage.getItem('ch03.search') ?? '');

constructor() {
  effect(() => {
    localStorage.setItem('ch03.search', this.search());
  });
}
```

- **What good looks like:** type into the search box, refresh the page, the search box still has your text.
- **Why effect is the right tool:** writing to `localStorage` is a **side effect** — it changes something outside the Angular world. Computeds must be pure; effects exist exactly for this.

### Exercise 4 — stretch — defer a heavy "stats" panel

**Theory you need:** *`@defer`*, *`computed`*.

Add a new card below the filter card with heavy-looking stats (average, min, max of `filtered().amount`). Wrap the whole card body in `@defer (on viewport)` with a `@placeholder` that says "scroll to load stats."

- **What good looks like:** the card is visible with just a placeholder until you scroll it into view, then the real content appears.
- **Reality check:** on this tiny dataset the "heavy" work is instant. The point of the exercise is the mechanics — on a real DB app the deferred thing might be a chart library or a 10,000-row grid.

---

## 6. Common pitfalls

- **Writing `effect`s that call `.set`.** 95% of the time you wanted a `computed`. Effects are for *external* side effects (console, localStorage, DOM, API). If an effect modifies another signal, it can create re-run loops.
- **Mutating inside `.update`.** `users.update(list => { list.push(x); return list; })` returns the same reference → signal thinks nothing changed → UI doesn't update. Always return a new array/object.
- **Method calls in `{{ }}`.** `{{ computeTotal() }}` runs on every change detection cycle. Convert to a `computed`.
- **Forgetting to import pipes.** `number`, `currency`, `date`, `json`, etc. are from `@angular/common` and must be in `imports: [...]`. The error message is usually "No pipe found with name 'number'."
- **Reading a signal without `()`.** `{{ count }}` prints `function signal() { ... }`. You need `{{ count() }}`.
- **Treating `effect` as a lifecycle hook.** It's not `ngOnInit`. It fires immediately AND on every signal change its body reads. If you only want "once on load," use a plain constructor statement.

---

## Next

Chapter 04 — Directives & pipes. The built-in pipes you'll use daily, writing a custom pipe, writing a custom structural directive. Also `[class.foo]`, `[style.width.px]`, and other binding shorthands you've already seen without a formal introduction.
