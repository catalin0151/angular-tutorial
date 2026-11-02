# Chapter 11 — State with signals (a lightweight store)

**Goal:** Build the modern Angular "store": a `@Injectable` service that owns private writable signals, exposes read-only views + computed derivations, and provides methods to mutate state. This replaces the role NgRx/Redux/Vuex played in older apps for 90% of use cases.

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

### `linkedSignal` — a reactive snapshot that resets when a source changes

Not covered in detail here but worth knowing it exists in v19+. Example use: "a selected row ID that resets to `null` whenever the row list changes." It's a signal whose value you can set, but which also follows a source. Look it up in the Angular docs when you need it.

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

### Exercise 1 — compute `totalWithTax`
Add a `taxRate = signal(0.19)` and a `totalWithTax = computed(() => this.total() * (1 + this.taxRate()))`. Show it in the cart UI. Add a slider or input to change the tax rate.

### Exercise 2 — rehydrate from localStorage on load
Change `_items` to read from `localStorage` in its initializer. Handle the JSON-parse-might-fail case gracefully (empty cart on error).

### Exercise 3 — a second store that depends on the first
Create `OrderService` with `.placeOrder()` that reads `cart.items()`, POSTs to the ch09 mock backend (reuse `TransactionsService` or make a new endpoint — fine to just log for now), then calls `cart.clear()` on success. Show the service injecting the store.

### Exercise 4 — stretch — undo
Keep a history of past cart states in a separate signal. Add an `undo()` method that pops the last snapshot and restores it. Add an "Undo" button. (Hint: push to history BEFORE each mutation; cap history length at 10.)

---

## 6. Pitfalls

- **Exposing the writable signal publicly.** Then callers can bypass your methods and skip validation. Keep writable private, expose `.asReadonly()`.
- **Methods that read AND write multiple signals.** Fine if they're inside the store. Dangerous if spread across components.
- **Overusing `effect`.** Rule of thumb from ch03: if an effect calls `.set` on another signal, it should probably be a `computed`. Effects are for external side effects only (localStorage, console, DOM, network).
- **Trying to make the store "generic" too early.** Resist the urge to build a `createStore<T>()` factory. Three handwritten stores are easier to read than one clever abstraction.
- **Forgetting that `providedIn: 'root'` means ONE instance for the whole app.** If you need per-page or per-route state, create a feature-level service and provide it on the route.
