# Chapter 13 — Data grid

**Goal:** Build the single most important widget of any DB-style internal app — a server-side paginated, sortable, filterable data table. Composes everything from ch08, ch09, ch10, ch11 into one working UI.

---

## ⚠️ Prerequisites

Everything in this chapter hits the real backend. You need:

1. **Backend running** (`npm run dev` in `backend/`).
2. **Logged in** — chapter is gated with `authGuard`. Log in via Chapter 15 first.
3. **Database seeded** with 120 transactions (`npm run seed` in `backend/` once).

If any are missing, you'll either be bounced to login or see "No matching rows" on everything.

---

## 1. Theory

### What "server-side" means

A **client-side** grid loads all rows once, then sorts/filters/paginates in memory. Fine for 100 rows, broken for 100,000. The DB app will have tables with millions — you can't ship those to the browser.

A **server-side** grid sends `page`, `size`, `sort`, `dir`, and filter params to the backend on every change, and renders only the current page. This chapter uses the ch09 mock, which supports all of those.

### The grid's shape

Every server-side grid in the industry follows the same shape:

```
┌─ controls ───────────────────────┐
│ [search] [filter] [status]       │
├──────────────────────────────────┤
│ Column  │ Column ↑ │ Column   │ │  ← clickable sort headers
├──────────────────────────────────┤
│ row 1                             │
│ row 2                             │
│ ...                               │
├──────────────────────────────────┤
│ 1 of 50 — 2847 total   [←] [→]  │  ← pagination footer
└──────────────────────────────────┘
```

Five pieces of state drive it: `search`, `filters`, `sort`, `dir`, `page`. They all become query params in the HTTP request. Change any one → refetch.

### The pipeline — `combineLatest` all the state

Each piece of state is a signal. Any change should re-run the API call. This is **exactly** the ch10 pattern:

```ts
readonly response = toSignal(
  combineLatest([
    toObservable(this.search),
    toObservable(this.status),
    toObservable(this.sort),
    toObservable(this.dir),
    toObservable(this.page),
  ]).pipe(
    debounceTime(200),
    switchMap(([q, status, sort, dir, page]) =>
      this.api.list({ page, size: this.size, account: q, status, sort, dir })
    ),
  ),
  { initialValue: null }
);
```

- `combineLatest` fires whenever ANY of the five changes.
- `debounceTime(200)` batches rapid keystrokes so you don't hit the API 10 times when the user types.
- `switchMap` cancels any in-flight request when a new one starts — no out-of-order responses overwriting fresh data.
- `toSignal` converts the final observable to a signal for template consumption.

Then derive everything else from the response:

```ts
readonly items      = computed(() => this.response()?.items ?? []);
readonly total      = computed(() => this.response()?.total ?? 0);
readonly totalPages = computed(() => Math.ceil(this.total() / this.size));
readonly loading    = computed(() => this.response() === null);
```

### Sortable headers — the classic pattern

Click a column header → sort by that column. Click it again → flip direction. Click a different one → sort by it ascending.

```ts
setSort(key: SortKey) {
  if (this.sort() === key) {
    this.dir.update(d => d === 'asc' ? 'desc' : 'asc');
  } else {
    this.sort.set(key);
    this.dir.set('asc');
  }
  this.page.set(1);   // sorting invalidates the current page
}
```

Note the last line — **changing sort/filter/search should reset page to 1**. Otherwise you can end up on "page 5" of a filtered result that only has 2 pages, showing nothing.

### Pagination state — page vs total vs size

Three numbers from the backend, two derived:

| State | Where it lives | How it's set |
|---|---|---|
| `page` | Signal in the component | User clicks prev/next |
| `size` | Constant in the component | Fixed, e.g. 10 or 20 |
| `total` | From API response | Returned by the server |
| `totalPages` | `computed` | `Math.ceil(total / size)` |
| `loading` | `computed` | `response === null` |

Disable prev at page 1, disable next at `page >= totalPages`.

### Loading, empty, and error states

Every grid has three non-happy paths:

- **Loading** — show a spinner or skeleton, dim the controls.
- **Empty** — "no matching rows." Not an error; the user's filter just excluded everything.
- **Error** — "failed to load." Show a retry button.

The chapter demo covers loading and empty; error is Exercise 2.

### Why no `ag-grid` / `PrimeNG` grid

Both are excellent. But at your DB job you'll meet grids built every which way: Material tables, hand-rolled `<table>`s, ag-grid, PrimeNG, in-house abstractions. The **pattern** is the same across all of them. Once you can build it from scratch, dropping into any of those libraries is a matter of mapping their API to the same five-signal pipeline.

If the DB team already uses one, use it. If not, a hand-rolled table like this one is perfectly fine and is often the right call for an internal tool.

---

## 2. Why files are named/structured this way

- One component, one route — the grid is the page.
- Reuses `TransactionsService` from ch09. In the DB app this service would live in `shared/services/` since multiple chapters need it; the tutorial leaves it in ch09 to avoid shuffling files.
- No child components in this chapter — row rendering is inline in the template. **When would you break out a `<app-tx-row>` component?** When rows carry their own state (expand/collapse, inline edit). For read-only rows, inlining is fine.

---

## 3. Angular / Vue 2 / React parallel

| Angular | Vue 2 | React |
|---|---|---|
| Hand-rolled `<table>` with signals + `combineLatest` | plain template + `watch` on filters | `useReducer` + `useEffect` + `fetch` |
| `ag-grid-angular` | `ag-grid-vue` | `ag-grid-react` |
| Angular Material `MatTable` | `vuetify` data table | `@mui` DataGrid |
| PrimeNG `p-table` | PrimeVue `p-table` | PrimeReact `p-table` |

The hand-rolled version is the same everywhere: state, derived page count, click-to-sort. Libraries just package it.

---

## 4. Walkthrough

- `ch13-data-grid.ts` — five state signals, one `combineLatest` → `switchMap` pipeline → `toSignal`, derived `items` / `total` / `totalPages` / `loading`, `setSort` method.
- `ch13-data-grid.html` — search + status controls, sortable header `<th>`s with arrows, row rendering, pagination footer.
- `ch13-data-grid.css` — table styling + badge colors.

Open http://localhost:4200/ch13-data-grid. Click a column header, watch the arrow + network request. Type in the search box, watch it debounce. Hit prev/next.

Also note the mock interceptor at `shared/mock-api/mock-api.interceptor.ts` now supports `sort` and `dir` query params — I added those in this chapter so server-side sort actually works.

---

## 5. Exercises

### Exercise 1 — add a page-size selector

**Theory you need:** *Pagination state*, *Signal + `combineLatest`*.

The grid is hardcoded to 10 rows per page. Add a `<select>` for page size (10 / 25 / 50). Changing size should reset `page` to 1 and refetch.

- **Hint:** turn `size` from a constant into a `signal<number>(10)`, add it to the `combineLatest` tuple, update the `switchMap` destructure. Add an `onSize` method similar to `onStatus`.
- **What good looks like:** pick 25 → grid shows 25 rows, `totalPages` recomputes, pagination respects the new size.

### Exercise 2 — error + retry UI

**Theory you need:** *Loading, empty, and error states*, Chapter 09 *`catchError`*.

Right now if the API fails, the grid just stays in "Loading…" forever. Add an error path: on failure, store the error message in an `error` signal, show it in the template, and provide a Retry button that refetches.

- **Hint:** `catchError` inside the `switchMap` so a failure doesn't kill the outer stream. Convert the result to `{ items: [], total: 0, page, size, error: 'message' }` OR return `of(null)` and track error separately via a sibling signal updated in a `tap(_, err)`.
- **What good looks like:** temporarily break a URL to simulate failure → error block renders with "Request failed" + Retry → clicking Retry triggers a new request.

### Exercise 3 — column visibility toggle

**Theory you need:** *`signal<Set<string>>`*, *`@if` in `<th>` and `<td>`*.

Let the user show/hide columns. Add a "Columns" dropdown (or three checkboxes) above the table. Each toggles whether the corresponding `<th>` and `<td>` render.

- **Hint:** `readonly hidden = signal(new Set<string>())`. Toggle with `.update(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; })`. In the template wrap each column pair in `@if (!hidden().has('counterparty')) { ... }`.
- **What good looks like:** toggling a checkbox makes a column disappear and reappear without refetching (pure client-side). Column order remains stable.
- **Why this matters at the DB job:** every internal grid eventually sprouts a "save my preferred columns" feature. This is the foundation.

### Exercise 4 — stretch — URL-persistent state

**Theory you need:** Chapter 06 *Query params — read, write, merge*, *`withComponentInputBinding`*.

Make the grid's state **live in the URL**. `?q=ACC-001&status=pending&sort=amount&dir=desc&page=3` should reconstruct the exact view.

- **Hint:** read the initial values from `inject(ActivatedRoute).snapshot.queryParamMap`. When any state signal changes, call `router.navigate([], { queryParams: { ... }, queryParamsHandling: 'merge' })`. Easiest with a single `effect` that watches all five signals and writes to the URL.
- **What good looks like:** filter + sort + go to page 3 → URL updates. Copy URL to new tab → identical view loads. Hit browser back → previous grid state restored.
- **Why this matters:** "share a link to this exact view" is the single most-requested feature on internal tools. Build it in from day one.

---

## 6. Pitfalls

- **Not resetting `page` to 1 on filter/sort change.** User ends up "on page 5 of 2" — grid shows nothing. Always reset `page.set(1)` when search/filter/sort changes.
- **Doing sort/pagination client-side on a server-paginated grid.** You'd only sort the current page's 10 rows, not all 50,000. Server-side means the server does it.
- **`combineLatest` that debounces too aggressively.** `debounceTime(1000)` feels slow on sort/pagination clicks. 150–300ms is the sweet spot.
- **`switchMap` without the ch09 interceptor's `retry`.** One flaky request cancels the next and leaves the grid empty. Pair with a retry interceptor for 5xx.
- **Firing the initial request twice.** Easy to do if you also subscribe in `ngOnInit` — the `toSignal` pipeline already fires on construction. Pick one.
- **Clicking a sort header spam-fires requests.** `debounceTime(200)` handles it. If you want instant-feedback on click but still debounce typing, use `auditTime` only on the search signal.
- **Storing column widths / visibility in the URL.** Too noisy. Use `localStorage` for UI preferences, URL for the view's data state.
- **Forgetting to show `loading` on page change.** The user clicks "Next" and sees stale data for 400ms. Show the loading overlay even for subsequent fetches — don't gate it on "first load only."
- **Confusing `size` the constant with `size` the signal.** When Exercise 1 converts it to a signal, every `this.size` must become `this.size()`. Easy to miss one.