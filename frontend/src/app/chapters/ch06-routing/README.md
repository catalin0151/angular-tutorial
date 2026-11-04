# Chapter 06 — Routing

**Goal:** Child routes, lazy loading, route params, programmatic navigation. The three APIs you need daily: `[routerLink]`, `router.navigate()`, `ActivatedRoute.paramMap`.

---

## 1. Theory

### Routes = a tree

The app has a top-level route table (`app.routes.ts`). Each route can define **child routes** that render into a `<router-outlet />` inside the parent component. We used this at the chapter-switcher level already; now the chapter itself has children.

```ts
// app.routes.ts
{
  path: 'ch06-routing',
  loadComponent: () => import('./chapters/ch06-routing/ch06-routing').then(m => m.Ch06Routing),
  loadChildren: () => import('./chapters/ch06-routing/ch06.routes').then(m => m.ch06Routes),
}
```

```ts
// ch06.routes.ts (chapter's own child routes)
export const ch06Routes: Routes = [
  { path: '',             loadComponent: () => import('./overview/overview').then(m => m.Overview) },
  { path: 'accounts',     loadComponent: () => import('./accounts/accounts').then(m => m.Accounts) },
  { path: 'accounts/:id', loadComponent: () => import('./account-detail/account-detail').then(m => m.AccountDetail) },
];
```

The chapter template needs a `<router-outlet />` for the child to render into.

### `[routerLink]` — declarative navigation

```html
<a routerLink="./accounts">Accounts</a>
<a [routerLink]="['./accounts', accountId]">Account {{ accountId }}</a>
```

- String form for static URLs.
- Array form for dynamic paths (each segment separate).
- `./` is relative to the current route. `../` goes up. `/` is absolute.
- `routerLinkActive="active"` adds the class when the link matches.
- `[routerLinkActiveOptions]="{ exact: true }"` makes the match exact (otherwise `/foo` matches both `/foo` and `/foo/bar`).

### `router.navigate()` — programmatic

```ts
constructor() {
  this.router.navigate(['./accounts', 'ACC-042'], { relativeTo: this.route });
}
```

For when the destination depends on logic (after save, after login, after an API error).

### Three kinds of route data (and how to read each)

A URL like `/accounts/ACC-001?tab=history&open=true` carries **three** different kinds of data:

| Kind | Where it lives | Example | When it changes |
|---|---|---|---|
| **Path param** | `/accounts/:id` | `id = 'ACC-001'` | Different ID in URL path |
| **Query param** | `?tab=history&open=true` | `tab = 'history'`, `open = 'true'` | `?` section changes |
| **Static `data`** | Route config: `data: { title: 'Admin', requiresAuth: true }` | `title = 'Admin'` | Only when you edit the route table |

All three are available on `ActivatedRoute`:

```ts
private readonly route = inject(ActivatedRoute);

// paths — observables that fire on change
this.route.paramMap          // path params → Observable<ParamMap>
this.route.queryParamMap     // query params → Observable<ParamMap>
this.route.data              // static route data → Observable<Data>

// Snapshots — read once, don't react to changes
this.route.snapshot.paramMap.get('id');
this.route.snapshot.queryParamMap.get('tab');
this.route.snapshot.data['title'];
```

**Snapshot vs. observable — when to pick which:**
- **Snapshot** is fine when the component **unmounts** every time the URL changes. Rare in modern Angular — the router aggressively reuses components for performance.
- **Observable / signal** is safe always. Prefer it unless you have a specific reason not to.

**Signal version using `toSignal` (`toSignal` is covered in ch10):**

```ts
import { toSignal } from '@angular/core/rxjs-interop';

readonly id  = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')),  { initialValue: '' });
readonly tab = toSignal(this.route.queryParamMap.pipe(map(p => p.get('tab') ?? 'overview')), { initialValue: 'overview' });
```

### Query params — read, write, merge

Query params are for **non-essential, user-driven state in the URL** — filters, sort order, pagination, open tabs. Three rules:

- **They're shareable.** Pasting the URL reconstructs the view. Big win for internal tools: "look, this filter is weird" becomes a copy-paste instead of screenshots.
- **They don't reload the page.** Updating a query param is a soft navigation — same component instance, just re-reads the observable.
- **They're always strings.** `?page=3` arrives as `'3'`. Cast with `Number(...)` or `+x`.

Writing them from code:

```ts
private readonly router = inject(Router);
private readonly route  = inject(ActivatedRoute);

// Set a query param, replace others
this.router.navigate([], {
  queryParams: { q: 'ACC-001', page: 2 },
  queryParamsHandling: null,                 // (default) replace all
  relativeTo: this.route,
});

// Keep existing, add/overwrite one
this.router.navigate([], {
  queryParams: { page: 2 },
  queryParamsHandling: 'merge',              // merge with existing
  relativeTo: this.route,
});

// Remove a param
this.router.navigate([], {
  queryParams: { page: null },               // null removes it
  queryParamsHandling: 'merge',
});
```

Doing navigation with `queryParams` while keeping the current URL path — pass `[]` as the first arg (no path change) and use `relativeTo: this.route`.

### Route `data` — static info attached to a route

```ts
export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin').then(m => m.Admin),
    data: { title: 'Admin', breadcrumb: 'Admin Dashboard', requiresRole: 'admin' },
  },
];
```

Read it from the component:
```ts
readonly title = toSignal(
  this.route.data.pipe(map(d => d['title'] as string)),
  { initialValue: '' }
);
```

Use cases:
- Breadcrumbs (`data: { breadcrumb: 'Reports' }`)
- Page titles (modern alternative: `TitleStrategy`)
- Permission tags (`data: { requiresRole: 'admin' }`) — read from a guard
- Feature flags per route

### `withComponentInputBinding()` — let the router feed inputs directly

Instead of writing boilerplate to read `ActivatedRoute`, you can tell the router to **map path params, query params, and `data` directly to component `input()`s** by name:

```ts
// in app.config.ts
provideRouter(routes, withComponentInputBinding())
```

Then your component:
```ts
export class AccountDetail {
  readonly id    = input<string>('');          // from /:id in the path
  readonly tab   = input<string>('overview');  // from ?tab=history
  readonly title = input<string>('');          // from route data { title: '...' }
}
```

No `ActivatedRoute`, no `toSignal`, no RxJS. The router walks the route config and picks the matching name from path params first, query params second, data third.

**Rules:**
- The `input()` name must match the key exactly (path `:id` → `input<string>('id')` field named `id`).
- All inputs come in as strings (URLs are strings). Cast if you need a number: `const n = Number(this.page()) || 1`.
- You MUST enable it in `provideRouter(..., withComponentInputBinding())`. Not on by default for backwards compatibility.
- **In this tutorial it's already enabled** (we turned it on in Chapter 09's setup). Verify in `app.config.ts`.

**My recommendation:** use this everywhere. It eliminates 90% of `ActivatedRoute` code and is the direction Angular is pushing.

### Navigation lifecycle — `router.events`

The router fires events as navigation progresses. Subscribe for global spinners, analytics, scroll resets:

```ts
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';

constructor() {
  this.router.events.subscribe(event => {
    if (event instanceof NavigationStart) this.loading.set(true);
    if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
      this.loading.set(false);
    }
  });
}
```

Common events you'll filter on: `NavigationStart`, `NavigationEnd`, `NavigationCancel`, `NavigationError`.

**Where to put this:** usually in a service (`NavigationStatusService`) subscribed once in `AppComponent`'s constructor, exposing a `loading` signal everyone can read. Don't duplicate per page.

### Guards and resolvers (intro only — detailed in ch15)

Guards decide whether a route can be activated:

```ts
export const authGuard: CanActivateFn = () => inject(AuthService).isLoggedIn();
```

Register in the route: `{ path: 'admin', canActivate: [authGuard], ... }`. Functional guards (just functions) replaced class-based guards; you'll see both.

**`CanDeactivateFn<Component>` — leaving a route.** The guard receives the component instance that's about to be left, so you can inspect its state:

```ts
export const confirmLeaveGuard: CanDeactivateFn<AccountDetail> = (component) => {
  return !component.dirty() || confirm('Leave with unsaved changes?');
};
```

Register as `canDeactivate: [confirmLeaveGuard]` on the route. The function can return `boolean | Promise<boolean> | Observable<boolean>` — all three block navigation while they resolve to `false`.

### Lazy loading

Every chapter in this tutorial already uses `loadComponent` / `loadChildren` — Angular downloads the component's bundle on demand. Snappy initial load, pay-as-you-go. Default for anything that isn't on the first screen.

---

## 2. Why files are named/structured this way

- Chapter-level routes in `ch06.routes.ts`, children in subfolders (`overview/`, `accounts/`, `account-detail/`).
- Each child component is standalone and lazy-loaded individually.
- Pattern: for a feature with multiple screens, put the shell component + a `*.routes.ts` + a folder per screen.

---

## 3. Angular / Vue 2 / React parallel

| Angular | Vue 2 (vue-router) | React (react-router) |
|---|---|---|
| `[routerLink]="['./x', id]"` | `<router-link :to="{ path: 'x/' + id }">` | `<Link to={`/x/${id}`}>` |
| `router.navigate()` | `this.$router.push()` | `useNavigate()` + `navigate()` |
| `ActivatedRoute.paramMap` | `this.$route.params.id` | `useParams()` |
| `loadComponent` / `loadChildren` | `() => import('./X.vue')` on route | `React.lazy(() => import('./X'))` + `<Suspense>` |
| `<router-outlet />` | `<router-view>` | `<Outlet />` (v6) |
| `canActivate: [guard]` | `beforeEnter: (to, from, next) => ...` | custom wrapper component or `loader` |

Routing APIs are the same concept everywhere; only the syntax differs.

---

## 4. Walkthrough

- `ch06-routing.ts/.html` — shell with tab links + `<router-outlet />`.
- `ch06.routes.ts` — chapter-level route table.
- `overview/overview.ts` — the default child.
- `accounts/accounts.ts` — list, links to each account.
- `account-detail/account-detail.ts` — reads `:id` reactively via `toSignal(paramMap)`.

Click around. Watch the URL change. Try the programmatic button.

---

## 5. Exercises

### Exercise 1 — search persisted in query params

**Theory you need:** *Query params — read, write, merge*.

Add a search input to the Accounts page. Typing updates `?q=...` in the URL; reloading with the param set should pre-fill the input and filter the list.

- **Hint:** read with `toSignal(this.route.queryParamMap.pipe(map(p => p.get('q') ?? '')))`, write with `router.navigate([], { queryParams: { q: value || null }, queryParamsHandling: 'merge', relativeTo: this.route })`.
- **What good looks like:** URL changes as you type. Copy-paste the URL to a new tab and the filter persists.

### Exercise 2 — breadcrumb from route `data`

**Theory you need:** *Route `data` — static info attached to a route*.

Add `data: { breadcrumb: 'Overview' | 'Accounts' | 'Account Detail' }` to each child route in `ch06.routes.ts`. In the chapter shell, read the active child route's data and display its breadcrumb above the `<router-outlet />`.

- **Hint:** the simplest version is `data: { breadcrumb: '...' }` on each child + `withComponentInputBinding` makes it available as an `input()` on the child itself. Display it from the child, not the shell, to keep this exercise short.
- **What good looks like:** each child view shows its own breadcrumb string pulled from route config.

### Exercise 3 — replace `ActivatedRoute` with `input()` on three data sources

**Theory you need:** *`withComponentInputBinding()`*.

`withComponentInputBinding()` is already on in `app.config.ts`. In `AccountDetail`, replace ALL `ActivatedRoute` usage with `input()`s — one for the path param `id`, one for a query param `tab`, one for route data `breadcrumb`.

- **Hint:** add three navigation links inside the detail that just change `?tab=...` to prove the input updates reactively.
- **What good looks like:** zero `ActivatedRoute`, zero `toSignal`, three inputs read with `()`, URL changes update the UI immediately.

### Exercise 4 — stretch — `canDeactivate` for unsaved changes

**Theory you need:** *Guards (intro)*.

Write a `confirmLeaveGuard: CanDeactivateFn<AccountDetail>` that fires `confirm('Leave with unsaved changes?')` when the user tries to navigate away while a `dirty` signal is `true`. Attach it on the detail route.

- **Hint:** the component just needs `readonly dirty = signal(false)` + a text input that calls `dirty.set(true)` on change + a save button that clears it. The guard reads `component.dirty()` and returns `true` or `confirm(...)`.
- **What good looks like:** type in the input → navigate away → confirm dialog. Click Save first → navigate freely. Returning `true` / `false` / a `Promise<boolean>` / an `Observable<boolean>` all work.

---

## 6. Pitfalls

- **Forgot `<router-outlet />`.** Child components mount into the outlet. No outlet → nothing renders.
- **`routerLink="/foo"` vs `"./foo"`.** Leading slash = absolute. `./` = relative. Mixing them up sends you to the wrong place.
- **Snapshot params in a reused component.** If you only read `route.snapshot.paramMap.get('id')` once, you miss changes when Angular reuses the component instance. Use the reactive form OR `withComponentInputBinding()`.
- **Forgetting `routerLinkActiveOptions: { exact: true }` on a `/` link.** Without it, the root link stays active for every child route.
- **Query params are strings — always.** `?page=2` arrives as `'2'`, not `2`. Cast with `Number(x)` or `+x` or an input converter.
- **Query params default to REPLACE.** Omitting `queryParamsHandling: 'merge'` wipes out existing params on every navigate. Big footgun when adding one filter deletes another.
- **Removing a query param via `undefined` doesn't work.** Use `null` (Angular's convention): `{ queryParams: { page: null }, queryParamsHandling: 'merge' }`.
- **Route `data` doesn't inherit from parent routes by default.** Child routes see their own `data`, not the parent's. Set `paramsInheritanceStrategy: 'always'` on `provideRouter` if you want inheritance.
- **`withComponentInputBinding` input names must match the key exactly.** Path `:userId` → `input('')` field named `userId`. Case-sensitive.
- **Using `canDeactivate` with a signal-based `dirty` flag that's reset too eagerly.** If you reset `dirty = false` on every input change, the guard never fires. Reset only on successful save/cancel.
- **`router.events` subscribed per-component.** Fires for every navigation site-wide. Subscribe once in a service and expose a signal — don't duplicate.
