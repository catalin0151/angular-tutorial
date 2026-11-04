# Chapter 11 — State with signals (a lightweight store)

**Goal:** Build the modern Angular "store": a `@Injectable` service that owns private writable signals, exposes read-only views + computed derivations, and provides methods to mutate state. This replaces the role NgRx/Redux/Vuex played in older apps for 90% of use cases.

---

## ⚠️ Prerequisites

Exercise 2 ("Place an order") hits the real backend via `TransactionsService`. You need:

1. **Backend running** (`npm run dev` in `backend/`).
2. **Logged in** — chapter is gated with `authGuard`. Log in via Chapter 15.

The cart UI itself (adding/removing items) works offline — it's all client-side signals. The backend is only needed for the `placeOrder` exercise.

---

## 1. Theory

### The store pattern

```ts
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<CartItem[]>([]);     // private writable
  readonly items = this._items.asReadonly();             // public read-only
  readonly count = computed(() => this._items().reduce((n, i) => n + i.qty, 0));
  readonly total = computed(() => this._items().reduce((n, i) => n + i.qty * i.price, 0));

  add(item: Omit<CartItem, 'qty'>) { ... }
  remove(id: number)               { ... }
  clear()                          { ... }
}
```

Four rules:
1. **One writable signal per piece of state.** Keep it private (`_items`).
2. **Expose a readonly view** (`items = _items.asReadonly()`) so consumers can't bypass your methods.
3. **Derive everything you can with `computed`.** No getters, no methods for display-only values.
4. **Only methods mutate.** `add`, `remove`, `clear`. All go through `.update(...)` with new references.

### Why this instead of NgRx/Redux

- No actions, reducers, selectors, effects boilerplate.
- Type-safe end to end without ceremony.
- Fits perfectly in Angular's DI model.
- Easier to test (just call methods, assert on signals).

Reach for NgRx when:
- You need time-travel debugging.
- You have genuine complex async state orchestration (sagas).
- Your team is already deep in NgRx and conventions matter.

For most apps — including internal data tools like your DB project — a signal store is enough.

### Persistence via effect

```ts
constructor() {
  effect(() => {
    localStorage.setItem('cart', JSON.stringify(this._items()));
  });
}
```

Any signal change writes to localStorage. Rehydration (loading on startup) is done in the field initializer:

```ts
private readonly _items = signal<CartItem[]>(
  JSON.parse(localStorage.getItem('cart') ?? '[]')
);
```

That's the whole persistence pattern. In a real app you'd also handle schema version migrations.

### `linkedSignal` — a writable signal that tracks a source

A `linkedSignal` behaves like a normal signal (you can `.set()` it) **and** resets to a computed value whenever its source changes. Good for "selected row ID" that should reset to `null` when the row list reloads:

```ts
import { linkedSignal } from '@angular/core';

readonly transactions = signal<Transaction[]>([]);

readonly selectedId = linkedSignal<number | null>(() => {
  // runs when `transactions` changes — reset selection to the first row (or null)
  return this.transactions()[0]?.id ?? null;
});

// user can still override:
pick(id: number) { this.selectedId.set(id); }
```

When would you use this over a plain `signal`?
- **Plain signal:** user state that's independent (dark-mode flag, selected tab).
- **`computed`:** derived state, not user-writable (`total = qty * price`).
- **`linkedSignal`:** user-writable, but **reset when a source changes** (selected row after a list refresh).

The three fill distinct roles. Grab `linkedSignal` when "a plain signal keeps going stale when my source updates."

### Async actions in a store — the loading/error/data trio

Most real-world store methods do three things in order: start loading → await I/O → set the result or an error. The canonical shape:

```ts
@Injectable({ providedIn: 'root' })
export class OrdersStore {
  private readonly api = inject(OrdersApi);
  private readonly _orders  = signal<Order[]>([]);
  private readonly _loading = signal(false);
  private readonly _error   = signal<string | null>(null);

  readonly orders  = this._orders.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error   = this._error.asReadonly();

  async load() {
    this._loading.set(true);
    this._error.set(null);
    try {
      const data = await firstValueFrom(this.api.list());
      this._orders.set(data);
    } catch (e: any) {
      this._error.set(e?.message ?? 'Load failed');
    } finally {
      this._loading.set(false);
    }
  }
}
```

In the template, three signals drive three UI states:

```html
@if (store.loading()) { <p>Loading…</p> }
@else if (store.error(); as e) { <p class="err">{{ e }}</p> }
@else {
  @for (o of store.orders(); track o.id) { <p>{{ o.id }}</p> }
}
```

**Rules:**
- Keep `loading` and `error` as their own signals. Don't overload a single "status" string.
- Reset `error` at the **start** of each action, not at the end. Otherwise stale errors stick.
- Always use `finally` to clear `loading`. If you only clear it in the happy path, errors leave it `true` forever.

### Store composition — one store injects another

Stores are just `@Injectable` services. They inject each other via `inject()`:

```ts
@Injectable({ providedIn: 'root' })
export class OrderStore {
  private readonly cart = inject(CartStore);
  private readonly api  = inject(TransactionsService);

  async placeOrder() {
    const items = this.cart.items();
    await firstValueFrom(this.api.create({ /* derive from items */ }));
    this.cart.clear();
  }
}
```

This is how feature stores stay small — each owns one slice of state, composes with others via DI. No cross-store events, no pub/sub. Just method calls.

### History and undo

The "take a snapshot before each mutation" pattern:

```ts
private readonly _items = signal<CartItem[]>([]);
private readonly _history = signal<CartItem[][]>([]);

readonly canUndo = computed(() => this._history().length > 0);

private snapshot() {
  this._history.update(h => [...h, this._items()].slice(-10));  // cap at 10
}

add(item: CartItem)    { this.snapshot(); this._items.update(l => [...l, item]); }
remove(id: number)     { this.snapshot(); this._items.update(l => l.filter(i => i.id !== id)); }

undo() {
  const h = this._history();
  if (h.length === 0) return;
  this._items.set(h[h.length - 1]);
  this._history.update(h => h.slice(0, -1));
}
```

Two rules:
1. Snapshot **before** the mutation, not after — so undo goes back to the pre-mutation state.
2. Cap history length (`.slice(-10)`) — unbounded history is a memory leak.

### Store methods vs. component methods

**Rule:** state logic belongs in the store, not spread across components. If three components all need to call "add product to cart," they call `cart.add(product)`, not reimplement the array spread each time. Single source of truth for behavior.

---

## 2. Why files are named/structured this way

- `cart.store.ts` — the `.store.ts` suffix is a convention some teams use for signal-based stores. Not standard — many just call it `cart.service.ts`. Pick one and stick with it.
- Store lives next to the chapter in this tutorial. In the DB app, cross-chapter stores (`UserStore`, `CurrentFilterStore`) would move to `shared/stores/`.

---

## 3. Angular / Vue 2 / React parallel

| Angular | Vue 2 | React |
|---|---|---|
| `@Injectable` signal store | Vuex module | Zustand store (very close) |
| `.asReadonly()` | `getters` | custom hook returning value only |
| `computed` on store | Vuex `getters` | selector in Redux/Zustand |
| `effect` for persistence | subscribe to Vuex | middleware or `useEffect` |
| `providedIn: 'root'` | module-level singleton | module-level singleton |

**Vue 2 Vuex parallel is strongest here** — same mental model (state, getters, mutations), signals replace the magic reactivity, no action/mutation separation needed.
**Zustand is the closest React equivalent** — simple global stores with hooks.

---

## 4. Walkthrough

- `cart.store.ts` — the store. Private `_items`, readonly `items`, computed `count`/`total`/`isEmpty`, methods `add`/`increment`/`decrement`/`remove`/`clear`.
- `ch11-state-signals.ts` — injects the store, exposes it to the template, plus an effect that persists to localStorage.
- `ch11-state-signals.html` — catalog on the left, cart on the right. Clicking Add on a catalog row populates the cart.

Navigate away and back — the cart state survives (it's a singleton). Reload the page — state is in localStorage but we don't rehydrate (Exercise 2).

---

## 5. Exercises

### Exercise 1 — rehydrate the cart from localStorage

**Theory you need:** *Persistence via effect*.

The effect writes to localStorage on every change. Add the other half: read from localStorage when `CartStore` is constructed so the cart survives a full page reload. Handle the "corrupt JSON" case gracefully (fall back to empty).

- **Hint:** change the field initializer to a function call:
  ```ts
  private readonly _items = signal<CartItem[]>(this.loadFromStorage());

  private loadFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem('ch11.cart');
      return raw ? JSON.parse(raw) as CartItem[] : [];
    } catch {
      return [];
    }
  }
  ```
- **What good looks like:** add items → refresh the page → cart still populated. Corrupt the entry in DevTools (set it to `{{{`) → refresh → cart is empty, no crash.

### Exercise 2 — add a `PlaceOrder` button backed by an `OrderStore`

**Theory you need:** *Async actions in a store (loading/error/data trio)*, *Store composition*.

Create `order.store.ts` that injects `CartStore` and `TransactionsService` (from ch09). Add:
- a `loading` and `error` signal
- a `placeOrder()` async method that POSTs one transaction per cart item via `transactionsService.create(...)`, then calls `cart.clear()` on success
- In the chapter template, add a "Place order" button driven by a new component method. Show "Placing order…" while loading and the error message if it fails.

- **Hint:** use the loading/error/data template from the theory section. Example `placeOrder`:
  ```ts
  async placeOrder() {
    this._loading.set(true);
    this._error.set(null);
    try {
      for (const item of this.cart.items()) {
        await firstValueFrom(this.api.create({
          account: 'ACC-999', counterparty: item.name,
          amount: item.price * item.qty, currency: 'EUR', status: 'pending',
        }));
      }
      this.cart.clear();
    } catch (e: any) {
      this._error.set(e?.message ?? 'Order failed');
    } finally {
      this._loading.set(false);
    }
  }
  ```
- **What good looks like:** click Place Order → button disabled + "Placing order…" shown → requests fire (check Network tab) → cart clears on success. Nothing complex, just a realistic async store action.
- **Why this is the whole chapter in one exercise:** you've composed two stores, handled loading/error/success, and done it all without a single component owning any of this logic. This is the DB-app pattern for every write operation you'll ship.

### Exercise 3 — undo the last cart action

**Theory you need:** *History and undo*.

Add undo to `CartStore`. Every mutation (`add`, `increment`, `decrement`, `remove`, `clear`) should push the current `_items` value to a history signal BEFORE applying the change. Add an `undo()` method and a button that pops the last snapshot. Cap history at 10.

- **Hint:** add `private snapshot()` as shown in the theory, call it at the top of every mutating method. Expose `canUndo` as a `computed` so you can disable the button when empty.
- **What good looks like:** add 3 items → remove one → click Undo → removed item comes back. Cap test: add 20 items → history only holds the last 10.
- **Try also:** move the `snapshot()` call to AFTER the mutation and see undo go forward instead of back. Reinforces why order matters.

### Exercise 4 — stretch — `selectedItemId` as a `linkedSignal`

**Theory you need:** *`linkedSignal`*.

Add a `selectedItemId` to `CartStore` using `linkedSignal`. Its source should return the ID of the first cart item (or `null` if empty). When the user removes the selected item, the linked signal automatically resets to the new first item (or null).

Also add a click handler on each cart row that calls `cart.selectRow(item.id)` and highlights the selected row.

- **Hint:**
  ```ts
  readonly selectedItemId = linkedSignal<number | null>(() => this._items()[0]?.id ?? null);
  selectRow(id: number) { this.selectedItemId.set(id); }
  ```
- **What good looks like:** manually click a row to select it (highlight). Remove the selected row → selection auto-moves to the new first row. Add rows → your manual selection persists (because `linkedSignal` only resets when the computed source changes and the first item's id changes).
- **Why `linkedSignal` and not `computed`:** `computed` is read-only — you couldn't manually `selectRow(id)` if `selectedItemId` were a `computed`. And a plain `signal` wouldn't auto-reset when the list changes. `linkedSignal` is the one that does both.

---

## 6. Pitfalls

- **Exposing the writable signal publicly.** Then callers can bypass your methods and skip validation. Keep writable private, expose `.asReadonly()`.
- **Methods that read AND write multiple signals.** Fine if they're inside the store. Dangerous if spread across components.
- **Overusing `effect`.** Rule of thumb from ch03: if an effect calls `.set` on another signal, it should probably be a `computed`. Effects are for external side effects only (localStorage, console, DOM, network).
- **Trying to make the store "generic" too early.** Resist the urge to build a `createStore<T>()` factory. Three handwritten stores are easier to read than one clever abstraction.
- **Forgetting that `providedIn: 'root'` means ONE instance for the whole app.** If you need per-page or per-route state, create a feature-level service and provide it on the route.
- **Clearing `error` in `finally` instead of at the start.** `finally` runs after success too, so you'd nuke the error you just set. Reset `error` at the top of the action, not the bottom.
- **Forgetting `finally` for `loading`.** On exception, `loading` stays true forever. Always `finally { this._loading.set(false) }`.
- **Writing to `localStorage` on every signal change for huge data structures.** `effect(() => localStorage.setItem('x', JSON.stringify(bigSignal())))` runs on every edit. For bigger state, debounce with an RxJS pipeline (`toObservable(signal).pipe(debounceTime(500))`) before writing.
- **Stringifying `Map` / `Set` / `Date` for persistence.** `JSON.stringify(new Map())` is `{}`. Convert to arrays before serialize, back to Map on load.
- **Catching an error inside the store and not exposing it.** The UI has no way to react. Always write it to `_error` or similar — otherwise the user sees "nothing happened" when the save fails.
- **Snapshotting history AFTER the mutation.** Undo then goes forward instead of back. Snapshot **before**.
- **Using `linkedSignal` for state that never resets from a source.** It has a cost; use plain `signal` if you don't need the "follows the source" behavior.
