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

### Route params with `ActivatedRoute`

Two ways to read `:id`:

```ts
// Snapshot — read once at mount, doesn't update if the ID changes without unmounting
readonly id = this.route.snapshot.paramMap.get('id');

// Reactive — observable that fires on every param change
readonly id = toSignal(
  this.route.paramMap.pipe(map(p => p.get('id') ?? '')),
  { initialValue: '' }
);
```

Use the **reactive** version when the user might navigate from `/accounts/ACC-001` to `/accounts/ACC-002` without the component unmounting (which happens when the component is reused — common with just a param change).

`toSignal` converts an RxJS observable into a signal — covered properly in ch10.

**Shortcut: `withComponentInputBinding()`** — if you enabled this in `app.config.ts` when calling `provideRouter`, route params map directly to component `input()`s:

```ts
// in app.config.ts
provideRouter(routes, withComponentInputBinding())

// in the component
readonly id = input<string>('');   // auto-populated from :id
```

Much cleaner. If the project doesn't have it enabled, you fall back to `ActivatedRoute`.

### Guards and resolvers (intro only — detailed in ch15)

Guards decide whether a route can be activated:

```ts
export const authGuard: CanActivateFn = () => inject(AuthService).isLoggedIn();
```

Register in the route: `{ path: 'admin', canActivate: [authGuard], ... }`. Functional guards (just functions) replaced class-based guards; you'll see both.

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

### Exercise 1 — add a query param
Add a search input to the Accounts page. On change, call `router.navigate([], { queryParams: { q: searchTerm }, queryParamsHandling: 'merge' })`. Read it back with `route.queryParamMap`.

### Exercise 2 — a "not found" fallback
Add `{ path: '**', loadComponent: () => import('./not-found/not-found').then(m => m.NotFound) }` to `ch06.routes.ts`. Navigate to a bogus child URL to see it hit.

### Exercise 3 — enable `withComponentInputBinding`
Add it to `provideRouter(routes, withComponentInputBinding())` in `app.config.ts`. Then simplify `AccountDetail` to `readonly id = input<string>('')` — no `ActivatedRoute`, no `toSignal`.

### Exercise 4 — stretch — a basic guard
Create a `confirmGuard` that calls `confirm('Leave this view?')` and blocks navigation if the user cancels. Attach via `canDeactivate: [confirmGuard]` on the detail route.

---

## 6. Pitfalls

- **Forgot `<router-outlet />`.** Child components mount into the outlet. No outlet → nothing renders.
- **`routerLink="/foo"` vs `"./foo"`.** Leading slash = absolute. `./` = relative. Mixing them up sends you to the wrong place.
- **Snapshot params in a reused component.** If you only read `route.snapshot.paramMap.get('id')` once, you miss changes when Angular reuses the component instance. Use the reactive form.
- **Forgetting `routerLinkActiveOptions: { exact: true }` on a `/` link.** Without it, the root link stays active for every child route.
