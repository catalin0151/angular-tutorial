# Chapter 09 — HttpClient & backend

**Goal:** Make typed REST calls. Learn `HttpClient`, interceptors, error handling, and the service wrapper pattern. Hits the real Express+Prisma backend you started in Chapter 15.

---

## ⚠️ Prerequisites

This chapter hits `/api/transactions` on the real backend. You need:

1. **Backend running.** From `backend/` run `npm run dev`. Expect `[backend] listening on http://localhost:3000`.
2. **Logged in.** The `authGuard` on this chapter bounces you to the Chapter 15 login screen if not. Log in as any seeded user (Alice, Bob, Carlos — password matches the name).
3. **Database seeded.** If `npm run seed` was never run, you'll see "no rows" everywhere. Run it once.

The route for this chapter is gated with `canActivate: [authGuard]`. Trying to open it directly without a session silently redirects you to `/ch15-auth-guards`. Log in there, then come back.

---

## 1. Theory

### Setup — `provideHttpClient`

`HttpClient` is a service, but it needs to be provided in `app.config.ts`:

```ts
providers: [
  provideHttpClient(withInterceptors([apiBaseUrlInterceptor, authInterceptor])),
]
```

Then `inject(HttpClient)` anywhere.

### The service wrapper pattern

**Don't call `http.get(...)` directly from components.** Wrap it in a service:

```ts
@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private readonly http = inject(HttpClient);

  list(params: { page?: number; size?: number }) {
    return this.http.get<Page<Transaction>>('/api/transactions', { params });
  }

  get(id: number) { return this.http.get<Transaction>(`/api/transactions/${id}`); }
  create(input: Partial<Transaction>) { return this.http.post<Transaction>('/api/transactions', input); }
}
```

Why:
- One place to change the URL.
- One place to add retry, caching, headers.
- The component depends on your typed service, not on `HttpClient` directly — easier to test.

### Consuming — subscribe or `toSignal`

`HttpClient` methods return **Observables**. Two ways to use them:

**Subscribe (familiar from most tutorials):**
```ts
this.api.list({ page: 1 }).subscribe({
  next: res => this.items.set(res.items),
  error: err => this.error.set(err.message),
});
```

**Convert to a signal (preview of ch10 interop):**
```ts
readonly data = toSignal(this.api.list({ page: 1 }), { initialValue: null });
```

Signals are nice for display; subscribe is fine for one-off actions. On real projects you'll see both.

### HTTP verbs

```ts
http.get<T>(url, { params, headers })
http.post<T>(url, body, { headers })
http.put<T>(url, body)
http.patch<T>(url, partial)
http.delete<T>(url)
```

All return `Observable<T>`. The `<T>` is the response type — type it carefully, you don't get runtime enforcement.

### `HttpParams` — the right way to build query strings

Manual string concatenation (`` `?page=${p}&size=${s}` ``) breaks on special chars (`&`, `=`, spaces, `+`). Angular has a dedicated type:

```ts
import { HttpParams } from '@angular/common/http';

let params = new HttpParams()
  .set('page', String(page))
  .set('size', String(size));

if (status) params = params.set('status', status);
if (q)      params = params.set('q', q);

return this.http.get<Page<Transaction>>('/api/transactions', { params });
```

**Rules:**
- `HttpParams` is **immutable** — `.set(...)` returns a new instance. The `let` + reassign pattern above is the idiomatic way.
- Values must be `string | number | boolean` or arrays of those. Angular handles encoding.
- Alternative shorthand: `{ params: { page: 1, size: 20 } }` — Angular converts the plain object to `HttpParams` for you. Works for the common case.

### Reading the full response (`observe: 'response'`)

By default `http.get<T>(url)` gives you just the body. If you need headers or status:

```ts
http.get<Transaction[]>('/api/transactions', { observe: 'response' })
  .subscribe(res => {
    console.log(res.status);                // 200
    console.log(res.headers.get('X-Total')); // read pagination header
    console.log(res.body);                   // the Transaction[]
  });
```

Returns `Observable<HttpResponse<T>>` instead of `Observable<T>`. Common use case: pagination metadata exposed as headers instead of in the JSON body.

### Reading errors (`HttpErrorResponse`)

When a request fails, the error subscriber gets an `HttpErrorResponse`:

```ts
this.api.list({ page: 1 }).subscribe({
  next: res => { ... },
  error: (err: HttpErrorResponse) => {
    err.status;       // 404, 500, 0 (network)...
    err.statusText;   // "Not Found"
    err.error;        // the server's response body (often the error JSON)
    err.url;          // the failed URL
  },
});
```

Status `0` means the request didn't reach the server at all — network error, CORS block, offline. Treat it differently from real HTTP statuses.

### `catchError` — recover or transform errors

Instead of the error callback on `subscribe`, pipe `catchError` into the observable. You get to return a **fallback observable** so the stream recovers:

```ts
import { catchError, of } from 'rxjs';

this.api.list({ page: 1 }).pipe(
  catchError((err: HttpErrorResponse) => {
    console.warn('load failed, using empty list', err);
    return of({ items: [], total: 0, page: 1, size: 20 });   // fallback
  }),
).subscribe(res => this.items.set(res.items));
```

Or re-throw after logging:

```ts
catchError(err => {
  this.logger.error(`API ${err.status}: ${err.message}`);
  return throwError(() => err);
})
```

**Rule of thumb:** use `catchError` in the service for errors you can recover from (fallback, cached value). Let others propagate to the component.

### Cancelling in-flight requests with `switchMap`

If the user types fast in a search box, you fire a request per keystroke. Without cancellation, out-of-order responses can overwrite each other:

```ts
import { switchMap, debounceTime } from 'rxjs';

this.form.controls.q.valueChanges.pipe(
  debounceTime(300),
  switchMap(q => this.api.list({ page: 1, q })),   // cancels previous request
).subscribe(res => this.items.set(res.items));
```

`switchMap` **cancels** any in-flight observable when a new value arrives. Covered more in ch10, but you'll reach for it the first time you build a search box.

### Writing an interceptor that pipes the response

Interceptors can transform the response, not just the request. `next(req)` returns an `Observable<HttpEvent<unknown>>` — pipe it like any observable:

```ts
import { tap, retry } from 'rxjs';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const start = performance.now();
  return next(req).pipe(
    tap({
      next: () => console.log(`[${req.method}] ${req.url} — ${(performance.now() - start).toFixed(0)}ms`),
      error: err => console.warn(`[${req.method}] ${req.url} FAILED`, err),
    }),
  );
};

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    retry({ count: 2, delay: 500 }),   // retry twice on failure
  );
};
```

The pipeline flows request → request → ... → network → response → interceptor pipes → subscriber. Each interceptor can both **modify the request going out** (via `req.clone`) and **observe/transform the response coming back** (via `.pipe()`).

### Interceptors — middleware for every request

An interceptor is a function that intercepts every outgoing HTTP request. Use cases:
- Attach auth tokens: `req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })`.
- Log every call.
- Mock a backend (what we're doing).
- Retry on transient errors.

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authed);
};
```

Register in order via `withInterceptors([a, b, c])`. They form a chain — call `next(req)` to continue.

### Error handling

HTTP errors come as `HttpErrorResponse`. Three places to handle:
1. **Per call** — `.subscribe({ error })` or `.pipe(catchError(err => ...))`.
2. **Per service** — wrap all methods in a shared `catchError` operator.
3. **Global** — an interceptor that catches all errors (logging, redirecting on 401).

The real-world pattern: handle **user-recoverable** errors per call (show a validation message), handle **network/auth** errors globally (toast, redirect to login).

### The real backend — Express + Prisma + MySQL

Hits `http://localhost:3000/api/*` on a real Express server. The server verifies your JWT on every request. Logging in on Chapter 15 attaches the Bearer token to every outgoing request via the `authInterceptor`. A separate `apiBaseUrlInterceptor` rewrites `/api/...` to `http://localhost:3000/api/...` so frontend code can stay environment-agnostic.

Backend endpoints used here:
- `GET /api/transactions?page=&size=&account=&status=&sort=&dir=` — paged list
- `GET /api/transactions/:id` — one
- `POST /api/transactions` — create
- `GET /api/accounts` — list of known accounts

Code lives in `backend/src/routes/transactions.ts`.

---

## 2. Why files are named/structured this way

- Services end in `.service.ts` (or just `.ts` in the v20 convention).
- Interceptors live in `shared/` because they apply app-wide, not per chapter.
- The `TransactionsService` lives next to the chapter that owns it. When ch13 (data grid) uses it too, we'll promote it to `shared/services/`.

---

## 3. Angular / Vue 2 / React parallel

| Angular | Vue 2 | React |
|---|---|---|
| `inject(HttpClient).get<T>(url)` | `axios.get(url)` | `fetch` or `axios` |
| `HttpInterceptorFn` | `axios.interceptors.request.use()` | custom `fetch` wrapper or axios interceptor |
| typed response `<T>` | TS types with any client | TS types with any client |
| `provideHttpClient` in `app.config.ts` | create an axios instance | create a `fetchClient` util |

Angular bundles the HTTP client, so you don't need a third-party library. The interceptor system is more structured than axios'.

---

## 4. Walkthrough

- `backend/src/routes/transactions.ts` — the real Express route serving the data.
- `transactions.service.ts` — typed wrapper around `/api/transactions`.
- `ch09-http-backend.ts` — component that lists transactions with pagination.
- `ch09-http-backend.html` — table + prev/next + add-random button.

Open the route — you'll see "Loading…" briefly, then a table. Click + random to POST a new row.

---

## 5. Exercises

### Exercise 1 — add a status filter using `HttpParams`

**Theory you need:** *`HttpParams`*, *Service wrapper pattern*.

Add a status `<select>` to the chapter (options: `all`, `pending`, `cleared`, `failed`). On change, re-run `load()` with the chosen status. Build the query string with `HttpParams`, not template literals.

- **Hint:** add a `status` signal to the component, add a `status?: string` arg to `load()`, pass it through to `this.api.list({ page: 1, size: 10, status: status })`. Inside the service, build `HttpParams` with `.set('status', status)` only when `status && status !== 'all'`.
- **What good looks like:** picking "pending" refetches and shows only pending rows; picking "all" shows everything.

### Exercise 2 — recover from a load error with `catchError`

**Theory you need:** *`catchError`*, *Reading errors (`HttpErrorResponse`)*.

Right now when `load()` fails, the component shows "Request failed" but the previous rows disappear. Add a `catchError` inside the service's `list()` method that returns a fallback `{ items: [], total: 0, page, size }` on error AND logs the status to the console.

- **Hint:** pipe inside `list()`:
  ```ts
  return this.http.get<Page<Transaction>>(...).pipe(
    catchError((err: HttpErrorResponse) => {
      console.warn(`list failed: ${err.status} ${err.statusText}`);
      return of({ items: [], total: 0, page: params.page ?? 1, size: params.size ?? 20 });
    }),
  );
  ```
- **What good looks like:** when it fails (you can simulate by changing a URL in the service to `/api/transactionsxxx`), you get an empty table instead of a crash, and a warning in the console. When it succeeds, nothing changes.
- **Why this teaches error handling:** `catchError` in the service means callers never need `.subscribe({ error })` — they just get a safe default. Trade-off: callers no longer know a failure happened. Pick the pattern per service based on who needs to react.

### Exercise 3 — logging interceptor with timing

**Theory you need:** *Interceptors*, *Writing an interceptor that pipes the response*.

Create `shared/interceptors/logging.interceptor.ts` that logs `[METHOD] URL — Xms` for every request. Use `performance.now()` to measure; use `tap` to hook into both success and error.

- **Hint:** the exact skeleton is in the theory ("Writing an interceptor that pipes the response"). Register it in `app.config.ts` by adding it to `withInterceptors([apiBaseUrlInterceptor, loggingInterceptor, authInterceptor])` — order matters, put it **after** the URL rewrite so you log the final URL hitting the network.
- **What good looks like:** open DevTools console → every API call prints its method, URL, and duration. POST a new row → see the POST logged.
- **Bonus:** color-code success vs error: `console.log('%c[GET] /api/x — 350ms', 'color: green')` for success, red for error.

### Exercise 4 — stretch — retry failing requests twice

**Theory you need:** *Writing an interceptor that pipes the response*, *Reading errors*.

Create `shared/interceptors/retry.interceptor.ts` that retries any failed request up to 2 times with a 500ms delay, but **only** for `GET` requests (retrying a `POST` can duplicate data) and **only** on status ≥ 500 (don't retry 4xx — the client did something wrong).

- **Hint:** use `retry({ count: 2, delay: 500 })` from RxJS, wrapped in `filter`-logic to skip non-retryable cases. Easiest shape:
  ```ts
  if (req.method !== 'GET') return next(req);
  return next(req).pipe(
    retry({
      count: 2,
      delay: (err) => err.status >= 500 ? timer(500) : throwError(() => err),
    }),
  );
  ```
- **What good looks like:** simulate a server error — stop the backend (`Ctrl+C` in the backend terminal), or add `res.status(500).json({error: 'test'})` at the top of `transactions.ts` list handler. Open the network tab → see 3 attempts spaced 500ms apart. POST requests fail immediately (no retries). Restore the backend when done.
- **Why this matters at the DB job:** retry-on-5xx is the single most common interceptor in enterprise Angular. One place to add resilience to the entire app's HTTP layer.

---

## 6. Pitfalls

- **Forgot `provideHttpClient()`.** Error: *"NullInjectorError: No provider for HttpClient."*
- **Calling `.subscribe()` and forgetting to unsubscribe for long-lived observables.** HttpClient observables complete after one response — they're safe to subscribe to without unsubscribing. For `valueChanges` or infinite streams, use `takeUntilDestroyed()` (ch10).
- **Not typing the response.** `http.get(url)` returns `Observable<unknown>` — annoying to use. Always `http.get<T>(url)`.
- **Catching errors globally and swallowing them.** Easy to lose track of what's failing. Log in the interceptor, re-throw unless you've genuinely handled it.
- **Using `.toPromise()`.** Deprecated. Use `firstValueFrom(obs)` or `lastValueFrom(obs)` from RxJS instead.
- **Mutating `HttpParams` with `.set()` and expecting the original to change.** `HttpParams` is immutable; `.set()` returns a new instance. The `let params = new HttpParams(); params = params.set(...)` pattern is required.
- **`.set()` vs `.append()` on `HttpParams`.** `.set('a', 1)` replaces; `.append('a', 1)` adds a second value (useful for `?tag=x&tag=y`). Mixing them silently drops values.
- **Retrying POST requests.** Duplicates data. Always guard `if (req.method !== 'GET') return next(req)` before retrying.
- **Reading `err.status === 0` as "server error".** `0` means **network failure** — request didn't reach the server (offline, CORS, DNS). Handle it as a connectivity issue, not a 5xx.
- **Interceptor registered in the wrong order.** Interceptors run in array order: `withInterceptors([apiBaseUrl, logging, auth])` means `apiBaseUrl` rewrites the URL first, then `logging` sees the final URL, then `auth` adds the token. Putting `logging` before `apiBaseUrl` logs the pre-rewrite URL — confusing.
- **`catchError` after a `switchMap` that errors.** `catchError` placed outside `switchMap` ends the outer stream — your search box stops working after one error. Put `catchError` **inside** the `switchMap` so only the inner request fails:
  ```ts
  switchMap(q => this.api.list({ q }).pipe(catchError(() => of(EMPTY_PAGE))))
  ```
