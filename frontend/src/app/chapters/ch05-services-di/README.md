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

| Scope                     | How you register                                 | How many instances |
|---------------------------|--------------------------------------------------|---------------------|
| `providedIn: 'root'`      | On the `@Injectable` decorator                   | **One** for the whole app (singleton) |
| per-component `providers` | `providers: [MyService]` on a `@Component`       | **One per component instance.** Each copy of the component gets its own service, scoped to that subtree. |
| per-route `providers`     | `providers: [MyService]` on a route config       | One per route activation |
| `providedIn: 'platform'`  | On the `@Injectable` decorator                   | One per browser process (multi-apps on one page). Rare. |

**Rule of thumb:** start with `providedIn: 'root'`. Only scope narrower when you specifically need per-instance isolation.

### Component-level providers (the "per-instance service" pattern)

This is the pattern you'll reach for maybe 5–10% of the time, but it's indispensable when you need it. The idea: instead of one global instance, give **each copy of a component its own fresh service instance** that is destroyed when the component is destroyed.

```ts
@Injectable()   // ← note: NO providedIn
export class WizardStore {
  readonly step = signal(1);
  next() { this.step.update(s => s + 1); }
  reset() { this.step.set(1); }
}

@Component({
  selector: 'app-wizard',
  providers: [WizardStore],   // ← one WizardStore PER wizard instance
  template: `...`,
})
export class Wizard {
  readonly store = inject(WizardStore);
}
```

If you put two `<app-wizard>` elements on the page:
- With `providedIn: 'root'` on the service → both wizards share one `step` (clicking Next in one advances both). Usually a bug.
- With `providers: [WizardStore]` on the component → each wizard has its own `step`. Correct.

**Services provided this way are also available to child components in the template**, through the DI tree. So an `<app-wizard-step>` nested inside `<app-wizard>` can `inject(WizardStore)` and get the same instance as its parent.

**When to use component-level providers:**
- Wizards (each with its own step state)
- Modal dialogs (each with its own form state)
- Reusable widget components with internal state that must not leak between instances
- Any time you need "state scoped to this component tree, destroyed when the component unmounts"

**When NOT to use:** anything the whole app should share — user, cart, preferences, logger. Those are `providedIn: 'root'`.

**Rules & gotchas:**
- Remove `providedIn: 'root'` from the service's `@Injectable()` decorator when using component-level providers. Having both is contradictory — `providedIn: 'root'` wins and the service becomes a singleton, defeating the point.
- The service's lifecycle is tied to the component's. When the component is destroyed, Angular destroys the service too (implement `ngOnDestroy` on the service if you need cleanup).
- Child components under the provider automatically get the same instance via DI tree walking. No manual passing.

**Vue 2 parallel:** closest is Vue 2's `provide`/`inject` with per-component data — the service is defined once but each instance of the parent "provides" its own copy to its subtree.
**React parallel:** this is `<MyContext.Provider value={myInstance}>` wrapping a subtree, where each `<Provider>` gets its own `myInstance`. Components below `useContext(MyContext)` to pull it out.

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

Each exercise is a mini real-world scenario, not a mechanical "add a line." After doing all four, you should have the muscle memory for every DI pattern you'll hit on the job.

### Exercise 1 — build a shared `UserService` and prove it's a singleton

**Scenario:** your app needs to know the current logged-in user from anywhere — header, sidebar, pages, forms. This is textbook "shared state across unrelated components" — the single most common reason you write a service.

**Theory you need:** *What is a service*, *`inject()`*, *`providedIn: 'root'`*, Chapter 03's *`computed`*.

Create `user.service.ts` next to `logger.service.ts`:

```ts
import { Injectable, computed, signal } from '@angular/core';

export interface User {
  id: number;
  name: string;
  role: 'admin' | 'trader' | 'ops';
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly _currentUser = signal<User | null>(null);

  readonly currentUser  = this._currentUser.asReadonly();
  readonly isLoggedIn   = computed(() => this._currentUser() !== null);
  readonly displayName  = computed(() => this._currentUser()?.name ?? 'Guest');

  login(user: User) { this._currentUser.set(user); }
  logout()          { this._currentUser.set(null); }
}
```

**In `ch05-services-di.ts`,** inject the user service alongside the logger. Add three buttons: "Login as Alice", "Login as Bob", "Logout". Use the logger to log each action.

**Add a small header to the template** that reads from `userService.displayName()` and `userService.isLoggedIn()`:

```html
<p>Signed in as: <strong>{{ userService.displayName() }}</strong></p>
```

- **What good looks like:** click a login button → the display name updates immediately AND an entry appears in the log list below. Click Logout → name goes back to Guest, log entry added.
- **Why this teaches singletons:** both pieces of UI (the header text and the log list) are driven by the same service instance. If `UserService` were instantiated per component, the display name would be out of sync with any log entries about login state. The singleton guarantees consistency without props drilling.

### Exercise 2 — one service injecting another (`UserService` logs itself)

**Scenario:** when a user logs in or out, you want it recorded in the log automatically — regardless of which component triggered it. The right place for that logic is **inside `UserService`**, not scattered across every caller. This exercise teaches the "service composition" pattern.

**Theory you need:** *Services asking for other services*, Chapter 03's *`effect`*.

Modify `UserService` to inject `LoggerService` and log changes to `_currentUser` automatically:

```ts
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { LoggerService } from './logger.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly logger = inject(LoggerService);
  private readonly _currentUser = signal<User | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  // ...computeds...

  constructor() {
    effect(() => {
      const u = this._currentUser();
      if (u) this.logger.info(`User logged in: ${u.name}`);
      else   this.logger.info('User logged out');
    });
  }

  login(user: User) { this._currentUser.set(user); }
  logout()          { this._currentUser.set(null); }
}
```

**In the chapter component,** remove the "manually log login/logout" code you added in Exercise 1. The log should still fill up on login/logout — because the service does it itself now.

- **What good looks like:** click login → log entry appears, even though the component doesn't call `logger.info` anymore. The service self-logs.
- **Why this teaches service composition:** `UserService` depends on `LoggerService` the same way a component does — via `inject()`. The DI container builds them lazily and wires them. **This is the DB-app pattern** — your real app will have maybe 20 services, each depending on 2–5 others, all composed by DI without you writing wiring code.
- **Watch for:** on first load, the effect fires once with `_currentUser === null` → you get a `"User logged out"` entry even before anyone logged in. That's technically a bug of the effect design — fix it by checking against a `wasLoggedIn` flag or skipping the first fire. Try both approaches and see which reads cleaner.

### Exercise 3 — same service, different injection styles (prove they're equivalent)

**Scenario:** your team's old code uses constructor DI, new code uses `inject()`. You need to be fluent in both because you'll read both daily. This exercise forces you to feel the difference.

**Theory you need:** *`inject()` — getting a service into a component* (both styles).

Create a tiny new component `app-session-badge` as a child of the chapter (anywhere — folder structure as you like). It should:
- Display the current user name (or "Guest").
- Display the total log entry count.

**Write it twice, in two separate files:**

**Version A — modern (`session-badge.ts`):**
```ts
import { Component, inject } from '@angular/core';
import { UserService } from '../user.service';
import { LoggerService } from '../logger.service';

@Component({
  selector: 'app-session-badge-modern',
  template: `<span>{{ user.displayName() }} ({{ logger.entries().length }} events)</span>`,
})
export class SessionBadgeModern {
  readonly user = inject(UserService);
  readonly logger = inject(LoggerService);
}
```

**Version B — legacy constructor DI (`session-badge-legacy.ts`):**
```ts
import { Component } from '@angular/core';
import { UserService } from '../user.service';
import { LoggerService } from '../logger.service';

@Component({
  selector: 'app-session-badge-legacy',
  template: `<span>{{ user.displayName() }} ({{ logger.entries().length }} events)</span>`,
})
export class SessionBadgeLegacy {
  constructor(public user: UserService, public logger: LoggerService) {}
}
```

Add both to the chapter template:
```html
<p>Modern:  <app-session-badge-modern /></p>
<p>Legacy:  <app-session-badge-legacy /></p>
```

- **What good looks like:** both badges always display identical values. Login as Alice → both update together. Log an event → both counts tick together.
- **Why this exercise matters:** confirms with your own eyes that `inject()` and constructor DI produce **the exact same instance**. There's no "modern service" vs. "legacy service" — only how you ask for it. You'll find yourself converting old `constructor(private x)` to `readonly x = inject(X)` in your first week on the job; this exercise makes the mechanical equivalence intuitive.
- **Bonus:** try adding a third badge where the constructor uses `private` instead of `public`. See the compile error ("property is private"). Discover why so many old codebases use `public` to avoid writing a getter.

### Exercise 4 — component-level providers (per-instance state)

**Scenario:** you're building a filter panel component. The requirement: when the user puts two filter panels on the same page (one for transactions, one for accounts), **each panel keeps its own filter state**. Globally scoping the state would mean changing one panel's dropdown mutates the other — clearly wrong.

This is where `providers: [MyService]` on the component earns its keep.

**Theory you need:** *Component-level providers (the "per-instance service" pattern)*.

Create `filter.store.ts`:

```ts
import { Injectable, signal } from '@angular/core';

@Injectable()   // ← NO providedIn — this will be registered per-component
export class FilterStore {
  readonly search = signal('');
  readonly status = signal<'all' | 'active' | 'archived'>('all');

  reset() {
    this.search.set('');
    this.status.set('all');
  }
}
```

Create a child component `app-filter-panel`:

```ts
import { Component, inject } from '@angular/core';
import { FilterStore } from './filter.store';

@Component({
  selector: 'app-filter-panel',
  providers: [FilterStore],              // ← one FilterStore per <app-filter-panel>
  template: `
    <div class="panel">
      <input type="text" [value]="store.search()" (input)="store.search.set($any($event.target).value)" placeholder="search" />
      <select [value]="store.status()" (change)="store.status.set($any($event.target).value)">
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </select>
      <button type="button" (click)="store.reset()">Reset</button>
      <p>Current: "{{ store.search() }}" / {{ store.status() }}</p>
    </div>
  `,
})
export class FilterPanel {
  readonly store = inject(FilterStore);
}
```

**In the chapter template,** add TWO instances side by side:
```html
<h3>Transactions filter</h3>
<app-filter-panel />

<h3>Accounts filter</h3>
<app-filter-panel />
```

- **What good looks like:** type "ACC-001" in the first panel's search → only that panel's "Current" line updates. The second panel is untouched. Change status in one → only one panel reflects it. Reset one → the other keeps its values.
- **Prove it's broken with the opposite setup:** change `FilterStore` to `@Injectable({ providedIn: 'root' })` and remove `providers: [FilterStore]` from the component. Reload. Now typing in one panel updates both — they share one global instance. **This is the bug `providers: [...]` prevents.**
- **Why this teaches scoping:** component-level providers are the Angular answer to "I want this component to own its state, like React's `useState`-with-sibling-isolation gives you by default." Without this, services force sharing. With it, services can be local.
- **Bonus:** add a `<p>Modified: {{ store.lastChangeAt | date:'HH:mm:ss' }}</p>` to the panel, driven by an `effect` in the store that updates a timestamp signal on any change. Confirm that each panel's timestamp advances independently.

---

## Summary of what you've exercised

- **Exercise 1:** write a `providedIn: 'root'` service with signals + computeds. Standard shared-state pattern.
- **Exercise 2:** service-to-service injection via `inject()`. Composition without wiring.
- **Exercise 3:** `inject()` vs. constructor DI are equivalent — proven side-by-side.
- **Exercise 4:** component-level `providers: [...]` gives per-instance scoping. Essential for reusable widgets.

Together these cover the three provider scopes you'll use (`root`, per-component, service-to-service composition) in realistic scenarios you'll meet in the first month at the DB app.

---

## 6. Pitfalls

- **Instantiating a service with `new`.** Never. Let DI do it: `inject(LoggerService)`.
- **Exposing a mutable signal publicly.** Keep the writable signal private, expose `.asReadonly()`. Consumers reading `.entries()` should not be able to call `.set()`.
- **Over-scoping.** Default to `providedIn: 'root'`. Per-component providers are for isolated state (wizards, modals), not general shared state.
- **Circular dependencies between services.** If `A` injects `B` and `B` injects `A`, you'll get a runtime error. Factor out the shared piece into a third service.
