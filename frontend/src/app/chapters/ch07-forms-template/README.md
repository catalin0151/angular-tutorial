# Chapter 07 — Template-driven forms

**Goal:** Learn `ngModel` and template-reference-based form state. Great for small forms, limited for anything dynamic — which is why ch08 (Reactive forms) exists.

---

## 1. Theory

### `ngModel` — two-way binding on an input

```html
<input [ngModel]="form().name" (ngModelChange)="patch('name', $event)" name="name" />
```

Or, with full two-way sugar:
```html
<input [(ngModel)]="name" name="name" />
```

The "banana in a box" `[(x)]` is Angular's two-way binding syntax. It desugars to `[x]="x"` + `(xChange)="x = $event"`. With signals, we usually split it (as shown above) because `signal.set($event)` is cleaner than mutating a field.

**`name` attribute is required** when inside a `<form>` — it's how Angular registers the control with the form group.

**Vue 2 parallel:** `v-model` on inputs. Direct 1:1 — `v-model` IS `[(ngModel)]`.
**React parallel:** `value={x} onChange={e => setX(e.target.value)}` — Angular compresses it, React keeps the two halves visible.

### Template references for form state

```html
<form #f="ngForm" (ngSubmit)="submit()">
  <input #nameCtrl="ngModel" required ... />
  @if (nameCtrl.touched && nameCtrl.invalid) { ... }
  <button [disabled]="f.invalid">Submit</button>
</form>
```

- `#f="ngForm"` — hands you the whole form's state object (valid, invalid, touched, value, etc.).
- `#nameCtrl="ngModel"` — hands you one control's state. Access `.errors`, `.valid`, `.touched`, `.dirty`.
- Submit via `(ngSubmit)="..."` on the form (not `(submit)` — `ngSubmit` auto-prevents default).

### Built-in validators

Add as HTML attributes:
- `required`
- `minlength="2"`, `maxlength="20"`
- `pattern="[a-z]+"`
- `email` (type=email)
- `min="0"`, `max="100"` (type=number)

Angular reads them and populates `control.errors`.

### Why template-driven is "the simple one"

- Low ceremony — just add `ngModel` and go.
- All state lives in the template; the class is minimal.
- Fine for login forms, settings dialogs, small signup pages.

### Why you'll graduate to Reactive Forms

- Dynamic forms (add/remove fields) are awkward with template-driven.
- Custom validators are harder to compose.
- Testing is harder (you need DOM).
- Type safety is weaker.

For anything beyond ~5 fields or anything dynamic, use Reactive Forms (ch08).

---

## 2. Why files are named/structured this way

Nothing new. One component. Note that `FormsModule` must be imported — it provides the `ngModel`/`ngForm` directives.

---

## 3. Angular / Vue 2 / React parallel

| Angular | Vue 2 | React |
|---|---|---|
| `[(ngModel)]="x"` | `v-model="x"` | `value={x} onChange={e => setX(e.target.value)}` |
| `#f="ngForm"` | `$refs.form` + manual tracking | `react-hook-form` or useState |
| `required`, `minlength` attributes | same HTML attributes | HTML5 attributes + custom logic |
| `(ngSubmit)` | `@submit.prevent` | `onSubmit={e => { e.preventDefault(); ... }}` |

Angular's template-driven forms feel most like Vue 2 — both lean on `v-model`/`ngModel` for the heavy lifting.

---

## 4. Walkthrough

- `ch07-forms-template.ts` — holds a `form` signal + a `patch(key, value)` helper. Imports `FormsModule`.
- `ch07-forms-template.html` — inputs bound via `[ngModel]`/`(ngModelChange)`, template refs for validation state.
- The debug `<pre>` at the bottom shows the current form state as JSON.

---

## 5. Exercises

### Exercise 1 — pure two-way with `[(ngModel)]`
Rewrite one input to use `[(ngModel)]="form().name"` directly. Observe that it won't work with the signal — because `[(ngModel)]="x"` requires a plain mutable field. Then add a plain field `nameField = ''` and use that. Discuss which style you prefer.

### Exercise 2 — add a password with min 8 chars
Add a `password` field with `minlength="8"` and a show/hide button that toggles the input's `type` attribute between `password` and `text`.

### Exercise 3 — custom reactive validation (preview of ch08)
Add a `confirm password` field. Show an error when it doesn't match password. Hint: you'll need to read both control refs in the template.

### Exercise 4 — stretch — reset on submit
After a successful submit, reset the form to its initial state (hint: `signal.set(initialValue)` and `f.resetForm()`).

---

## 6. Pitfalls

- **Forgot the `name` attribute.** `ngModel` inside `<form>` silently fails to register without `name`.
- **Forgot to import `FormsModule`.** Error: *"Can't bind to 'ngModel'."*
- **`[(ngModel)]="aSignal()"`** — doesn't work. Two-way needs a plain settable property, not a signal call. Use the split syntax instead.
- **Validating on `invalid` alone.** Shows errors immediately on load. Pair with `.touched` or `.dirty` so the user sees errors only after interacting.
