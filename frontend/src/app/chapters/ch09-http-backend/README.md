# Chapter 09 — HttpClient & backend

**Goal:** Make typed REST calls. Learn `HttpClient`, interceptors, error handling, and the service wrapper pattern. Uses a mock in-memory backend so no real server is required yet.

---

## 1. Theory

### Setup — `provideHttpClient`

`HttpClient` is a service, but it needs to be provided in `app.config.ts`:

```ts
providers: [
  provideHttpClient(withInterceptors([mockApiInterceptor])),
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

### The mock backend in this app

`shared/mock-api/mock-api.interceptor.ts` catches any URL starting with `/api/` and returns mock data with simulated latency. Keep this interceptor in place through ch10/11. When we build the real Express backend later, we delete the interceptor and the service calls work unchanged.

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

- `shared/mock-api/mock-api.interceptor.ts` — fake backend, 100 transactions, 350ms simulated latency.
- `transactions.service.ts` — typed wrapper around `/api/transactions`.
- `ch09-http-backend.ts` — component that lists transactions with pagination.
- `ch09-http-backend.html` — table + prev/next + add-random button.

Open the route — you'll see "Loading…" briefly, then a table. Click + random to POST a new row.

---

## 5. Exercises

### Exercise 1 — add a status filter
Add a `<select>` for status. On change, re-call `load()` with the status param. The mock already supports it.

### Exercise 2 — show detail
Add a click handler on each row that calls `api.get(id)` and displays the full transaction in a side pane.

### Exercise 3 — build a logging interceptor
Create `logging.interceptor.ts` that logs method + URL + response time to the console. Register it in `app.config.ts` before `mockApiInterceptor`.

### Exercise 4 — stretch — retry on 5xx
Create a `retryInterceptor` that retries failed requests up to 2 times if the error status is ≥ 500. Hint: use `retry({ count: 2, delay: 500 })` from RxJS inside the interceptor's returned observable.

---

## 6. Pitfalls

- **Forgot `provideHttpClient()`.** Error: *"NullInjectorError: No provider for HttpClient."*
- **Calling `.subscribe()` and forgetting to unsubscribe for long-lived observables.** HttpClient observables complete after one response — they're safe to subscribe to without unsubscribing. For `valueChanges` or infinite streams, use `takeUntilDestroyed()` (ch10).
- **Not typing the response.** `http.get(url)` returns `Observable<unknown>` — annoying to use. Always `http.get<T>(url)`.
- **Catching errors globally and swallowing them.** Easy to lose track of what's failing. Log in the interceptor, re-throw unless you've genuinely handled it.
- **Using `.toPromise()`.** Deprecated. Use `firstValueFrom(obs)` or `lastValueFrom(obs)` from RxJS instead.
