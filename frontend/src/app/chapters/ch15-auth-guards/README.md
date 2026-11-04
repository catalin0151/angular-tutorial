# Chapter 15 — Auth, guards, interceptors

**Goal:** Build the complete auth loop that every real app needs: log in against a real backend, receive a JWT, attach it to every API request, gate routes by role, auto-logout on 401. First chapter against the real Express+Prisma backend.

---

## 1. Theory

### The auth state lives in a store

Auth is shared state — the header shows the current user, routes check whether to let you in, components conditionally show admin controls. All of that reads from one `AuthStore`:

```ts
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _token = signal<string | null>(this.loadToken());
  private readonly _user  = signal<User | null>(this.loadUser());

  readonly isLoggedIn = computed(() => this._token() !== null);
  readonly role       = computed(() => this._user()?.role ?? null);

  async login(email: string, password: string) { ... }
  logout() { this._token.set(null); this._user.set(null); localStorage.removeItem(KEY); }
}
```

Three signals: `token`, `user`, derived `isLoggedIn` / `role`. Persisted to localStorage so a reload doesn't log you out.

### JWT in 60 seconds

A JWT is three base64 blobs joined by `.`: `header.payload.signature`. The payload is a JSON object with claims (`sub`, `role`, `exp`). The backend signs it with a secret; the backend can verify it later without hitting the database.

```
eyJhbGciOiJIUzI1NiJ9     ← header  { "alg": "HS256" }
.eyJzdWIiOjEsInJvbGUiOiJhZG1pbiJ9  ← payload { sub, role, name, ... }
.H3gsMk...               ← signature (HMAC-SHA256 of header+payload with the secret)
```

You can decode the payload in the browser (`atob(token.split('.')[1])`) — **it's not encrypted, just signed**. Never put secrets in a JWT.

**Key rules:**
- **Don't trust the client.** JWT role claims are informational for the UI. The server verifies them on every request.
- **Expire tokens.** We use 1-hour expiry. On expiry the server returns 401 and the interceptor auto-logs out.
- **Store carefully.** Options: `localStorage` (we use this — convenient, vulnerable to XSS), `sessionStorage` (cleared on tab close), httpOnly cookie (safer but needs CSRF protection). The DB app will probably pick cookies; tutorials use localStorage.

### The auth interceptor — attach the token to every API request

An HTTP interceptor runs on every outgoing request. We use it to attach `Authorization: Bearer <token>`:

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);
  const token = auth.token();

  const isApi = req.url.includes('/api/');
  const isLogin = req.url.endsWith('/api/auth/login');
  const shouldAttach = !!token && isApi && !isLogin;

  const outgoing = shouldAttach
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(outgoing).pipe(
    catchError((err: HttpErrorResponse) => {
      // Global 401 handling: expired/invalid token → log out
      if (err.status === 401 && shouldAttach) auth.logout();
      return throwError(() => err);
    })
  );
};
```

Two jobs:
1. **Outbound:** attach the Bearer token (except for the login call itself — no token to attach yet).
2. **Inbound:** on 401, clear the local auth state so the UI goes back to the login screen.

### Route guards — functional `CanActivateFn`

A guard is a function that returns `true` / `false` / `Promise<boolean>` / `Observable<boolean>`. Angular calls it before activating the route; `false` cancels the navigation.

```ts
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/ch15-auth-guards']);   // bounce to login
  return false;
};
```

**Role-based guards** — write a factory so you can parameterize:

```ts
export const roleGuard = (requiredRole: 'admin' | 'user'): CanActivateFn => {
  return () => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    if (!auth.isLoggedIn()) { router.navigate(['/ch15-auth-guards']); return false; }
    if (!auth.hasRole(requiredRole)) { router.navigate(['/ch15-auth-guards']); return false; }
    return true;
  };
};
```

Register in the route config:
```ts
{ path: 'admin', canActivate: [roleGuard('admin')], loadComponent: () => import(...) }
```

**Don't trust guards alone.** A user can hack their localStorage to say `role: 'admin'`. Guards are **UX** — they prevent accidental navigation. **The backend still checks the real role on every request** via `requireRole` middleware.

### Interceptor order matters

Interceptors are a pipeline. We registered two:

```ts
provideHttpClient(withInterceptors([apiBaseUrlInterceptor, authInterceptor]))
```

Processing order on the way out: `apiBaseUrlInterceptor` rewrites `/api/...` → `http://localhost:3000/api/...`, then `authInterceptor` attaches the Bearer token. Reversed on the way back in. If you put `authInterceptor` first, it would be inspecting unrewritten URLs — same behavior here but easier to reason about this way.

### Guest = not logged in (no row in the database)

Only two roles exist in the DB: `user` and `admin`. "Guest" is just the absence of a session — `auth.user() === null`. The UI switches with a single `@if (!auth.isLoggedIn())`.

### The backend contract

For reference, the Express routes this chapter hits:

| Method | Path | Body / Headers | Returns |
|---|---|---|---|
| `POST` | `/api/auth/login` | `{ email, password }` | `{ token, user: { email, name, role } }` or 401 |
| `GET` | `/api/auth/me` | `Authorization: Bearer <token>` | `{ email, name, role }` |
| `GET` | `/api/admin/metrics` | Bearer token, **admin role required** | `{ users, transactions, uptime }` or 403 |

The backend signs tokens with a 1h expiry. Expiry errors come back as 401.

---

## 2. Why files are named/structured this way

- `auth.store.ts` next to the chapter — specific to auth UI; promoted to `shared/stores/` in a real app since every feature needs the user.
- `auth.guard.ts` in the chapter folder for now. In a real app, guards live wherever they're most reused.
- `shared/interceptors/auth.interceptor.ts` and `api-base-url.interceptor.ts` in `shared/` because they're app-wide.
- Three subfolders (`public/`, `admin/`) hold the two gated views + their templates inline.

---

## 3. Angular / Vue 2 / React parallel

| Angular | Vue 2 | React |
|---|---|---|
| `@Injectable` AuthStore | Vuex `auth` module | Zustand `useAuthStore` |
| `HttpInterceptorFn` | axios interceptors | custom `fetch` wrapper |
| `CanActivateFn` | `router.beforeEach` + check | wrapper `<ProtectedRoute>` component |
| `localStorage` persistence | same | same |
| JWT in `Authorization: Bearer` | same | same |

The pattern is universal; only the framework APIs differ.

---

## 4. Walkthrough

- `auth.store.ts` — the store with signals, login/logout, localStorage persistence.
- `auth.guard.ts` — `authGuard` and `roleGuard(role)` functional guards.
- `shared/interceptors/auth.interceptor.ts` — attaches Bearer token + handles 401.
- `shared/interceptors/api-base-url.interceptor.ts` — rewrites `/api/...` to `http://localhost:3000/api/...`.
- `ch15-auth-guards.ts/.html/.css` — the shell with the login form AND the logged-in nav.
- `ch15.routes.ts` — child routes with `authGuard` and `roleGuard('admin')`.
- `public/public.ts` — any logged-in user can see.
- `admin/admin.ts` — admin only; calls `/api/admin/metrics`.

Try it:
1. Click login with Alice → you're in as admin → both tabs accessible.
2. Log out, log in as Bob (user) → clicking "Admin" bounces you back to login. The backend ALSO blocks the API call with 403.
3. Open DevTools → Application → Local Storage → see the `ch15.auth` entry with the token. Refresh the page → still logged in.
4. Edit the entry to corrupt the token → make any API call → auth interceptor catches 401, auto-logs you out.

---

## 5. Exercises

### Exercise 1 — add an `AdminOnly` directive for in-page UI

**Theory you need:** Chapter 04 *Directives*, *AuthStore*.

Currently the Admin tab is gated by a route guard. Sometimes you want in-page controls to be hidden — like a "Delete transaction" button that only admins see. Build a structural directive `*appAdminOnly` that only renders its content if the current user is an admin.

- **Hint:** structural directives use `TemplateRef` + `ViewContainerRef` + an `effect` that reads `AuthStore.role()`:
  ```ts
  @Directive({ selector: '[appAdminOnly]' })
  export class AdminOnly {
    private readonly tpl = inject(TemplateRef);
    private readonly vcr = inject(ViewContainerRef);
    private readonly auth = inject(AuthStore);
    constructor() {
      effect(() => {
        this.vcr.clear();
        if (this.auth.role() === 'admin') this.vcr.createEmbeddedView(this.tpl);
      });
    }
  }
  ```
- **What good looks like:** add `<button *appAdminOnly>Delete</button>` in the public view. Only admins see it; users see nothing.

### Exercise 2 — auto-logout on token expiry

**Theory you need:** *The auth interceptor*, Chapter 10 *`interval`*.

The JWT expires after 1 hour. The current interceptor catches 401 on the next API call — but if the user just sits on the page, they won't notice until they try to do something. Fix it: decode the token's `exp` claim on login, and schedule an auto-logout exactly when it expires.

- **Hint:** in `AuthStore.login()`, after setting the token, decode `atob(token.split('.')[1])` → read `exp`. Use `setTimeout(() => this.logout(), msUntilExp)`. Clear the timeout on `logout()`.
- **What good looks like:** manually set `exp` on your test token to 10 seconds in the future → wait 10 seconds → UI logs out automatically.
- **Why this matters:** in financial apps, "silent expiry" is a security requirement. Users left with a stale session on a shared machine is a real incident.

### Exercise 3 — show a `logged-in` user menu using the `AuthStore` from anywhere

**Theory you need:** *AuthStore*, Chapter 02 *components*.

Create a `<app-user-badge>` component that displays the current user's name + role + a logout button. Put it in the chapter shell AND in one other chapter (say ch13 data grid). Confirm both update together when you log in/out.

- **Hint:** the component just injects `AuthStore` and reads signals. Add it to the imports of both parent components.
- **What good looks like:** log in on the ch15 page → navigate to ch13 → the badge there shows Alice. Log out from the badge → both pages flip to "not logged in" state together.
- **Why this teaches singletons again:** one store, one instance, everywhere. The badge works everywhere because `providedIn: 'root'` means every `inject(AuthStore)` returns the same thing.

### Exercise 4 — stretch — a `canMatch` guard that hides the route entirely

**Theory you need:** *Route guards*.

`canActivate` lets you navigate to the URL and then redirect. `canMatch` goes further — it says the route **doesn't match at all** unless the condition passes. The URL silently falls through to the catch-all.

Convert the admin route from `canActivate: [roleGuard('admin')]` to `canMatch: [canMatchRole('admin')]`. Navigating to `/ch15-auth-guards/admin` as a non-admin should now 404 (hit the `**` wildcard) rather than bounce back to login.

- **Hint:** `CanMatchFn` has signature `(route, segments) => boolean | ...`. Same body as your `roleGuard` but returning `false` makes Angular keep looking for a matching route.
- **What good looks like:** as Bob, navigate to `/ch15-auth-guards/admin` → you get the top-level `**` fallback (a redirect to ch01-hello by default), not the login bounce.
- **Why `canMatch`:** cleaner UX when you want "this route doesn't exist for you" semantics. Also helps with route-matching performance on huge route trees.

---

## 6. Pitfalls

- **Forgetting to re-register interceptors after adding one.** `withInterceptors([...])` is the single source of truth — every interceptor must be in that array.
- **Interceptor order wrong.** If `authInterceptor` runs before `apiBaseUrlInterceptor`, it sees `/api/...` not the rewritten full URL. Usually still works but can confuse future-you.
- **Attaching tokens to third-party URLs.** Our `isApi` check prevents sending your JWT to `https://cdn.jsdelivr.net/...`. Without it, you'd leak the token on every asset fetch.
- **Trusting the client-side role.** `localStorage` is user-editable. Every protected request must be re-checked on the server with the real decoded token.
- **401 handling loop.** If `logout()` triggers another request that fails 401 (e.g. an analytics ping), you could get stuck. Our interceptor only auto-logs-out on calls that **had** a token attached (`shouldAttach` check).
- **Guards running before the token is restored on refresh.** If `AuthStore` reads localStorage asynchronously, the guard may run while `isLoggedIn()` is still false. Keep the restore synchronous (field initializer), as we do.
- **JWT exp in seconds vs. milliseconds.** The JWT spec uses **seconds since epoch**. JS `Date.now()` is **milliseconds**. Confusing them makes tokens expire instantly or 1000x later.
- **Storing passwords, keys, or anything sensitive in the JWT.** The payload is base64-encoded, not encrypted. Anyone with the token can read it.
- **Skipping `canActivate` because you added a navigation link.** Guards don't fire if the user types the URL directly. Always rely on guards, never on "hiding the link."
- **Forgetting to clear `_user` on logout.** If you only clear `_token`, `role()` still returns the stale role and the Admin tab stays active. Clear both.