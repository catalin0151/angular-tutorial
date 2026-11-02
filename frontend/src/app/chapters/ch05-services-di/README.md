# Chapter 05 — Services & Dependency Injection

**Goal:** Learn where shared state and shared behavior live in Angular, how components get hold of them, and why DI is the single biggest conceptual shift from React.

---

## 1. Theory

### What is a service?

A **service** is a plain TypeScript class that holds state, business logic, or I/O. Angular's DI container creates it, stores it, and hands the same instance to anyone who asks.

```ts
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly _entries = signal<LogEntry[]>([]);
  readonly entries = this._entries.asReadonly();

  info(msg: string) {
    this._entries.update(list => [...list, { at: new Date(), level: 'info', message: msg }]);
  }
}
```

- `@Injectable()` marks the class as injectable.
- `providedIn: 'root'` means **one singleton for the whole app**. Any component or service that asks for `LoggerService` gets the same instance.
- The service can own signals. Components read them for live UI, call methods to change state.

### `inject()` — getting a service into a component

Two syntaxes exist. Prefer the new one.

**Modern — `inject()`:**
```ts
export class MyComponent {
  readonly logger = inject(LoggerService);
}
```

**Legacy — constructor DI:**
```ts
export class MyComponent {
  constructor(private readonly logger: LoggerService) {}
}
```

Both work. `inject()` is preferred because:
- Works outside classes (functional guards, interceptors — ch15).
- No constructor noise.
- Easier to type and refactor.

You'll see constructor DI in older codebases. New code should use `inject()`.

### `providedIn` scopes — where the instance lives

| Scope                     | Example                                 | When to use |
|---------------------------|-----------------------------------------|-------------|
| `providedIn: 'root'`      | one for the whole app (singleton)       | 99% of services. Default. |
| `providedIn: 'platform'`  | one per browser process (multi-apps)    | multi-app composition. Rare. |
| per-component `providers` | `providers: [MyService]` in `@Component` | component-tree-scoped state (e.g., a wizard's step state) |

**Rule of thumb:** start with `providedIn: 'root'`. Only scope narrower when you specifically need per-component isolation.

### Services asking for other services

Services can inject other services using the same `inject()`:

```ts
@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly logger = inject(LoggerService);
  private readonly http   = inject(HttpClient);

  async generate() {
    this.logger.info('generating report');
    return await this.http.get('/api/report').toPromise();
  }
}
```

The DI container handles the wiring — you don't instantiate anything.

### Why DI matters

Three concrete wins:
1. **Testing** — swap `LoggerService` for a mock in tests by overriding the provider.
2. **Decoupling** — components depend on *types*, not instances. Swap implementations without changing callers.
3. **Lifecycle** — the framework owns creation and destruction, no `new SomeClass()` scattered around.

**Vue 2 parallel:** this is Vue 2 **plugins + `provide/inject`**, except Angular's DI is first-class and far more capable. Vue 2 lets you register globals (`Vue.use`) or inject hierarchically; Angular has a full tree-based DI container.
**React parallel:** closest is **context + custom hooks** (`useLogger()`), or a global store (Zustand, Redux). React has no runtime DI container.

---

## 2. Why files are named/structured this way

- `logger.service.ts` — the `.service` suffix is old-convention. New convention would be just `logger.ts`. For services I lean toward keeping the suffix because file lists get hard to read without it.
- Services live alongside the components that use them (`chapters/ch05-services-di/logger.service.ts`), **unless they're shared across chapters**. For a cross-chapter service you'd put it in `src/app/shared/services/`.
- A `*.service.ts` file is usually one class — no templates, no HTML.

---

## 3. Angular / Vue 2 / React parallel

| Angular | Vue 2 | React |
|---|---|---|
| `@Injectable({providedIn:'root'})` | plugin via `Vue.use()` or singleton module | module-level singleton or Context |
| `inject(LoggerService)` | `provide` / `inject` in options | `useContext(LoggerContext)` or custom hook |
| service with `signal`s | Vuex store module | Zustand store / Redux slice |
| provider override in tests | `jest.mock('./logger')` | `jest.mock('./logger')` |

**The one trap React devs fall into:** writing a service "just like a React context." Services aren't contexts — they're singletons by default. Don't instantiate state per component tree unless you really mean to.

---

## 4. Walkthrough

Three files:
- `logger.service.ts` — the service. Owns a private signal `_entries`, exposes a read-only view, provides methods.
- `ch05-services-di.ts` — injects the service, exposes it to the template.
- `ch05-services-di.html` — reads `logger.entries()` directly and calls `logger.clear()` from a button.

Click the info/warn/error buttons, watch the log fill up. Navigate away and back — the entries persist because the service is a singleton.

---

## 5. Exercises

### Exercise 1 — expose a `count` on `LoggerService`
Add a `readonly count = computed(() => this._entries().length)`. Show it in another chapter later to prove it survives navigation.

### Exercise 2 — a `max` cap
Add a config via constructor: `private readonly max = 100`. When pushing, trim to keep only the last `max`. Verify by looping with a quick effect in `ch05-services-di.ts`.

### Exercise 3 — a `UserService` with a current user signal
Create `user.service.ts` with `currentUser = signal<User | null>(null)`, `login(user)`, `logout()`. Add two buttons to the chapter to call them. Confirm the service is one singleton by logging the current user into the LoggerService on every change (hint: effect in the service's constructor).

### Exercise 4 — stretch — scope a `WizardService` per-component
Create a `WizardService` with a `step` signal. Provide it in the chapter component via `providers: [WizardService]` (NOT `providedIn: 'root'`). Verify that if you add two instances of this chapter in some test setup, they have separate `step` values.

---

## 6. Pitfalls

- **Instantiating a service with `new`.** Never. Let DI do it: `inject(LoggerService)`.
- **Exposing a mutable signal publicly.** Keep the writable signal private, expose `.asReadonly()`. Consumers reading `.entries()` should not be able to call `.set()`.
- **Over-scoping.** Default to `providedIn: 'root'`. Per-component providers are for isolated state (wizards, modals), not general shared state.
- **Circular dependencies between services.** If `A` injects `B` and `B` injects `A`, you'll get a runtime error. Factor out the shared piece into a third service.
