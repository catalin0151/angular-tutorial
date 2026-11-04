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

### Control state flags

Every control exposes four state flags you'll pair with validation errors:

| Flag | Meaning |
|---|---|
| `touched` | user has blurred/left the field at least once |
| `untouched` | opposite |
| `dirty` | user has changed the value from its initial state |
| `pristine` | opposite |
| `valid` / `invalid` | validators pass/fail |
| `pending` | an async validator is still running |

**Standard UX rule:** show errors only after the user has interacted. Pair with `touched` (not `invalid` alone):

```html
@if (nameCtrl.touched && nameCtrl.invalid) {
  <small class="err">...</small>
}
```

Shows nothing on first load; shows errors as soon as the user blurs the field.

### `ngModelOptions` — when to update the model

By default `ngModel` fires on every keystroke. Override with `[ngModelOptions]`:

```html
<input [(ngModel)]="email" name="email" [ngModelOptions]="{ updateOn: 'blur' }" />
```

Options:
- `'change'` — default. Fires on every input.
- `'blur'` — fires when the field loses focus. Good for expensive validators or fields where keystroke-level validation feels noisy.
- `'submit'` — fires only when the form is submitted. Rare but useful for wizards.

### Reading the form from the class with `@ViewChild(NgForm)`

Template refs are enough most of the time, but sometimes you need the form object in the class — to patch values, check validity before a save, reset after submit:

```ts
import { ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';

export class MyComponent {
  @ViewChild('f') form!: NgForm;

  reset() {
    this.form.resetForm();        // resets values + touched/dirty flags
  }

  patch() {
    this.form.form.patchValue({ name: 'Alice' });
  }
}
```

Template: `<form #f="ngForm" (ngSubmit)="submit(f)">`.

Note the distinction: `this.form` is the `NgForm` directive instance; `this.form.form` is the underlying `FormGroup` (template-driven forms are reactive forms under the hood — just configured by the template).

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

### Exercise 1 — add a password field with show/hide toggle

**Theory you need:** *`ngModel`*, *Built-in validators*.

Add a `password` field with `minlength="8"` and `required`. Beside it, add a button that toggles the `<input>`'s `type` between `'password'` and `'text'` so the user can reveal what they typed.

- **Hint:** bind `[type]="showPwd() ? 'text' : 'password'"` and flip a `showPwd` signal on click.
- **What good looks like:** typing 3 chars shows a min-length error (after blur); clicking the eye button reveals the characters.

### Exercise 2 — validate on blur, not on every keystroke

**Theory you need:** *`ngModelOptions`*.

Currently every keystroke updates `form()` and re-runs validators. For the `email` field, change this to validate only when the user leaves the field (so no "invalid email" warning while they're mid-typing).

- **Hint:** add `[ngModelOptions]="{ updateOn: 'blur' }"` to the email input.
- **What good looks like:** type `a@b` → no error shown mid-typing → tab away → error appears if invalid.

### Exercise 3 — match-password without ch08 helpers

**Theory you need:** *Template references for form state*.

Add a `confirmPassword` field. Show an error when it doesn't match `password`. Do it entirely in the template — no class logic.

- **Hint:** `#pwCtrl="ngModel"` on the password input, `#confirmCtrl="ngModel"` on the confirm input, then `@if (confirmCtrl.touched && pwCtrl.value !== confirmCtrl.value) { ... }`.
- **What good looks like:** mismatched passwords show an error under the second field after the user leaves it.
- **Why this teaches contrast with ch08:** template-driven cross-field validation is awkward — you're comparing values in template logic instead of having one validator function. Reactive forms (ch08) fix this with group-level validators.

### Exercise 4 — stretch — reset the form after submit via `@ViewChild(NgForm)`

**Theory you need:** *Reading the form from the class with `@ViewChild(NgForm)`*.

After a successful submit, clear all fields AND reset the `touched`/`dirty` flags so error messages disappear.

- **Hint:** grab the form with `@ViewChild('f') form!: NgForm;` then call `this.form.resetForm()` after the alert. Also reset your `form` signal to the initial `Contact` shape.
- **What good looks like:** submit → alert → all fields clear → no leftover error borders on required fields (because `touched` was reset too).
- **Why `resetForm()` and not just `signal.set(initial)`:** setting the signal clears the values, but `touched`/`dirty` are owned by the `NgForm` directive — you have to reset both sides.

---

## 6. Pitfalls

- **Forgot the `name` attribute.** `ngModel` inside `<form>` silently fails to register without `name`.
- **Forgot to import `FormsModule`.** Error: *"Can't bind to 'ngModel'."*
- **`[(ngModel)]="aSignal()"`** — doesn't work. Two-way needs a plain settable property, not a signal call. Use the split syntax `[ngModel]="s()"` + `(ngModelChange)="s.set($event)"` instead.
- **Validating on `invalid` alone.** Shows errors immediately on load. Pair with `.touched` or `.dirty` so the user sees errors only after interacting.
- **Clearing a signal but not calling `resetForm()`.** The values clear but the form stays `touched`/`dirty`, so error borders and messages stick. Reset both sides.
- **`required` on a `<select>` with an empty-string default option.** If the default `<option value="">—choose—</option>` matches your model's initial value, the form never becomes invalid. Set the model to `null` or use a non-empty sentinel.
- **Template-driven form inside a modal or `@defer`.** Controls register when they mount. If the form is lazily rendered, don't read `f.valid` or `#ctrl` until it's actually in the DOM.
