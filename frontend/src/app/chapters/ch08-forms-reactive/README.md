# Chapter 08 — Reactive forms

**Goal:** Build fluency with the form API that runs enterprise Angular apps. `FormGroup`, `FormControl`, `FormArray`, `FormBuilder`, built-in and custom validators, cross-field validation, dynamic forms. This is the most important chapter for your DB job.

---

## 1. Theory

### The model

A reactive form is a **tree of control objects declared in the class**, bound to the template by directives. The template is a view of the data; the data is in the class.

```ts
readonly form = new FormGroup({
  name: new FormControl('', [Validators.required, Validators.minLength(2)]),
  email: new FormControl('', [Validators.required, Validators.email]),
});
```

Three classes:
- `FormControl<T>` — one field.
- `FormGroup<T>` — object of controls. Nested groups allowed.
- `FormArray<T>` — ordered list of controls (dynamic rows).

### `FormBuilder` — less noise

```ts
private readonly fb = inject(NonNullableFormBuilder);

readonly form = this.fb.group({
  name: ['', [Validators.required, Validators.minLength(2)]],
  email: ['', [Validators.required, Validators.email]],
});
```

`NonNullableFormBuilder` makes every control non-nullable (`FormControl<string>` not `FormControl<string | null>`). Default `FormBuilder` has nullable types everywhere, which is annoying. **Prefer NonNullableFormBuilder** in new code.

### Binding to the template

```html
<form [formGroup]="form" (ngSubmit)="submit()">
  <input formControlName="name" />
  <input formControlName="email" />
</form>
```

- `[formGroup]="form"` on the form tag.
- `formControlName="name"` on each input — looks the control up by name on the parent group.
- Submit via `(ngSubmit)` as always.

For a nested group:
```html
<div formGroupName="address">
  <input formControlName="city" />
</div>
```

For a `FormArray`:
```html
<div formArrayName="tags">
  @for (c of tags.controls; track $index) {
    <input [formControlName]="$index" />
  }
</div>
```

### Reading values

```ts
this.form.value              // Partial<T> — undefined if a control is disabled
this.form.getRawValue()      // T — includes disabled values
this.form.controls.name.value
this.form.controls.name.errors
this.form.controls.name.valid / invalid / touched / dirty / pending
```

### Built-in validators (`Validators.*`)

- `required`, `requiredTrue`
- `minLength(n)`, `maxLength(n)`
- `min(n)`, `max(n)`
- `pattern(regex)`
- `email`

Apply as the second arg to `FormControl` / `fb.control`: `['', [Validators.required, Validators.email]]`.

### Custom validators

A validator is a function `(control) => ValidationErrors | null`.

```ts
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return pw && confirm && pw !== confirm ? { passwordsMismatch: true } : null;
}

// attach to the whole group
this.fb.group({ ... }, { validators: [passwordsMatch] });
```

Field-level validators attach at control creation. Cross-field validators attach at the group level.

### Dynamic forms with `FormArray`

```ts
get tags() { return this.form.controls.tags as FormArray<FormControl<string>>; }

addTag()      { this.tags.push(this.fb.control('')); }
removeTag(i)  { this.tags.removeAt(i); }
```

Lets users add/remove rows at will. This is the pattern behind every "add a filter," "add a line item," "add a column" UI you'll build.

### Reactivity

Every control exposes `valueChanges` and `statusChanges` as RxJS observables:

```ts
this.form.controls.search.valueChanges
  .pipe(debounceTime(300))
  .subscribe(v => this.doSearch(v));
```

Or convert to a signal (preview of ch10):

```ts
readonly nameValue = toSignal(this.form.controls.name.valueChanges, { initialValue: '' });
```

### Patching values from code

```ts
this.form.patchValue({ name: 'Alice' });        // partial — leaves other fields alone
this.form.setValue({ name: '', email: '', ... }); // must match the full shape
this.form.reset();                                // all back to the default — see gotcha below
```

**`.reset()` gotcha:** it clears to the control's **initial default** (`''` for strings, `null` otherwise), not your "sensible initial state." If you want to go back to specific values, pass them:

```ts
this.form.reset({ name: 'Alice', email: '' });
```

Also resets `touched` and `dirty` flags — same behavior as template-driven `NgForm.resetForm()`.

### Enabling / disabling controls programmatically

```ts
this.form.controls.payment.disable();   // removes from .value, skips validators
this.form.controls.payment.enable();    // back to normal
```

Common pattern: disable a field conditionally based on another field.

```ts
constructor() {
  this.form.controls.hasAddress.valueChanges.subscribe(has => {
    const addr = this.form.controls.address;
    has ? addr.enable() : addr.disable();
  });
}
```

Disabled controls are **excluded from `.value`** — use `.getRawValue()` if you need them in the submit payload.

### Marking state programmatically

Three commonly-used methods:

```ts
this.form.markAsTouched();              // one control (or the whole group)
this.form.markAllAsTouched();           // touches EVERY control recursively
this.form.markAsDirty();                // flag "value was changed"
this.form.markAsPristine();             // reset dirty
```

**Classic use case:** on submit, if the form is invalid, the user hasn't necessarily touched every field — so errors don't show. Fix:

```ts
submit() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();   // ← surfaces all validation errors at once
    return;
  }
  this.api.save(this.form.getRawValue());
}
```

### `updateOn` — when the model and validators run

Same option as template-driven forms, declared per control or per group:

```ts
this.fb.control('', { validators: [Validators.email], updateOn: 'blur' });
```

Useful for:
- **Expensive validators** (async username check) — avoid firing on every keystroke.
- **Noisy UX** — don't show "invalid email" while the user is still typing.

Options: `'change'` (default), `'blur'`, `'submit'`. Set once; can't change at runtime.

### Async validators

A validator can return a `Promise<ValidationErrors | null>` or `Observable<ValidationErrors | null>`. Angular sets `control.pending = true` while it's resolving, then applies the result.

```ts
import { AbstractControl, AsyncValidatorFn } from '@angular/forms';
import { map, of, timer, switchMap } from 'rxjs';

function uniqueUsername(api: UserApi): AsyncValidatorFn {
  return (ctrl: AbstractControl) => {
    const value = ctrl.value as string;
    if (!value) return of(null);
    return timer(400).pipe(                      // debounce so we don't hit API per keystroke
      switchMap(() => api.exists(value)),
      map(exists => exists ? { taken: true } : null),
    );
  };
}
```

Attach as the **third** argument to a control (sync validators second, async third):

```ts
this.fb.control('', [Validators.required], [uniqueUsername(this.api)]);
```

Or in a group config: `{ asyncValidators: [...] }`.

Show pending state in the template with `control.pending`:

```html
@if (ctrl.pending) { <small>checking…</small> }
@if (ctrl.errors?.['taken']) { <small class="err">that username is taken</small> }
```

### Reading errors in templates — the shape

`control.errors` is an object keyed by validator name. Each built-in validator has a known key:

| Validator | Key in `errors` | Payload |
|---|---|---|
| `required` | `required` | `true` |
| `minlength` | `minlength` | `{ requiredLength, actualLength }` |
| `maxlength` | `maxlength` | `{ requiredLength, actualLength }` |
| `min` | `min` | `{ min, actual }` |
| `max` | `max` | `{ max, actual }` |
| `pattern` | `pattern` | `{ requiredPattern, actualValue }` |
| `email` | `email` | `true` |
| custom | whatever your fn returns | whatever payload |

Use the key to show the right message:

```html
@if (ctrl.touched && ctrl.errors; as errs) {
  @if (errs['required'])  { <small class="err">Required.</small> }
  @if (errs['minlength']) { <small class="err">Min {{ errs['minlength'].requiredLength }} chars.</small> }
  @if (errs['taken'])     { <small class="err">Already taken.</small> }
}
```

---

## 2. Why files are named/structured this way

Reactive forms live entirely in the component class. For big forms (10+ fields), the pattern is to pull the form **builder** out into a service:

```ts
// user-form.service.ts
@Injectable()
export class UserFormService {
  constructor(private fb: NonNullableFormBuilder) {}
  build() { return this.fb.group({ ... }); }
}
```

...and have the component call `this.svc.build()`. Keeps components thin.

---

## 3. Angular / Vue 2 / React parallel

| Angular | Vue 2 | React |
|---|---|---|
| `FormGroup`/`FormControl` | plain reactive data + manual validation | `react-hook-form` |
| `Validators.required` | manual check or `vee-validate` | zod/yup schema + rhf |
| `FormArray` | reactive array + `v-for` | `useFieldArray` from rhf |
| `valueChanges` observable | `watch: { 'form.name'(v) {} }` | `watch()` from rhf |
| Cross-field validator | manual on submit | `superRefine` in a zod schema |

Reactive forms are Angular's strongest built-in system. The equivalents in Vue/React often require third-party libraries.

---

## 4. Walkthrough

- `ch08-forms-reactive.ts` — builds the form, declares a `passwordsMatch` cross-field validator, provides `addTag` / `removeTag`.
- `ch08-forms-reactive.html` — fully declarative: `[formGroup]`, `formControlName`, `formArrayName`, per-field error blocks.
- Try: type a name, intentionally mismatch passwords, add/remove tags, hit submit when invalid vs. valid.

---

## 5. Exercises

### Exercise 1 — nested group for address + `markAllAsTouched` on submit

**Theory you need:** *Binding to the template (nested group)*, *Marking state programmatically*.

Add an `address` nested FormGroup with `street` (required), `city` (required), `zip` (required + `Validators.pattern(/^\d{5}$/)`). In the submit handler, if the form is invalid, call `markAllAsTouched()` so all errors surface at once.

- **Hint:** group config: `address: this.fb.group({ street: ['', Validators.required], city: ['', Validators.required], zip: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]] })`. Template: `<fieldset formGroupName="address">`.
- **What good looks like:** click Submit without typing anything → every field shows its error, including inside the nested group. Fill all required fields correctly → submit succeeds.

### Exercise 2 — conditionally disable a field

**Theory you need:** *Enabling / disabling controls programmatically*, *Reactivity (`valueChanges`)*.

Add a checkbox control `subscribe` and a text control `emailList`. When `subscribe` is `false`, `emailList` must be **disabled** (grayed out, excluded from `.value`). When it's `true`, enable it and require it.

- **Hint:** subscribe to `this.form.controls.subscribe.valueChanges` in the constructor; toggle `this.form.controls.emailList.enable()` / `.disable()` accordingly.
- **What good looks like:** check the box → text input becomes editable, required. Uncheck → disabled, not required. Submit while subscribe is unchecked → `form.value` doesn't include `emailList`; `form.getRawValue()` does.
- **Why this matters at the DB job:** you'll build this exact pattern for dependent filters (enable date range only when "custom date" is picked, enable account dropdown only when "specific account" is selected, etc.).

### Exercise 3 — real async validator on `username`

**Theory you need:** *Async validators*, *Reading errors in templates*.

Add a `username` control that asynchronously checks against a fake "taken" list `['alice', 'bob']`. Use a 400ms debounce so it doesn't fire per keystroke. Show "checking…" while pending and "already taken" when it fails.

- **Hint:** write `uniqueUsername()` as `AsyncValidatorFn`:
  ```ts
  function uniqueUsername(): AsyncValidatorFn {
    return (ctrl) => timer(400).pipe(
      map(() => ['alice', 'bob'].includes(ctrl.value) ? { taken: true } : null)
    );
  }
  ```
  Attach as the **third** arg: `this.fb.control('', [Validators.required], [uniqueUsername()])`.
- **What good looks like:** type `alice` → "checking…" shows briefly → "already taken" appears. Type `catalin` → "checking…" → disappears, control becomes valid.
- **Bonus:** add `updateOn: 'blur'` so the validator doesn't fire mid-typing at all.

### Exercise 4 — stretch — live preview of the form via `valueChanges` → signal

**Theory you need:** *Reactivity (`valueChanges` + `toSignal`)*.

Pipe `this.form.valueChanges` through `debounceTime(300)` and convert to a signal. Render a live preview card beside the form that shows the user-facing summary (e.g., "Alice — alice@db.com — 1 tag"). Previews update 300ms after the user stops typing.

- **Hint:** `readonly live = toSignal(this.form.valueChanges.pipe(debounceTime(300)), { initialValue: this.form.getRawValue() })`. Then read `live()` in the template.
- **What good looks like:** type into the form → the preview card updates 300ms after you stop. No preview update while actively typing.
- **Why this teaches signal/RxJS interop:** `valueChanges` is RxJS, templates love signals — `toSignal` is the glue. You'll do this for any filter panel, any "search as you type", any live-validation UI.

---

## 6. Pitfalls

- **Forgot `ReactiveFormsModule` import.** Nothing works. Error is about unknown bindings.
- **Using `FormBuilder` instead of `NonNullableFormBuilder`.** You get `string | null` everywhere, which forces `?? ''` all over your code.
- **`formControlName` without `[formGroup]` on a parent form tag.** Error about the control not being found.
- **Reading `this.form.value` when controls are disabled.** Disabled controls are missing from `.value`. Use `.getRawValue()`.
- **Submit handler that silently accepts invalid forms.** No `markAllAsTouched` call → user sees nothing when they click submit, form just doesn't save. Always `markAllAsTouched()` + early return on `invalid`.
- **Treating the form object as a signal.** It's not. Use `valueChanges` + `toSignal` if you want signal interop.
- **`.reset()` wipes to default, not your initial state.** Pass the initial values: `this.form.reset({ name: 'Alice' })`.
- **Async validator fires per keystroke.** Without an internal `timer`/`debounce`, your API gets hammered. Build debounce into the validator itself (as in Exercise 3) OR set `updateOn: 'blur'`.
- **Disabled controls don't emit `valueChanges`.** If you have code watching for changes to drive derived UI, disabling the source kills the signal. Prefer `statusChanges` for "something changed" when disables are in play.
- **Reading `control.errors` when `touched` is false.** Errors are always computed; the UX rule is not to show them until the user interacts. Always guard: `@if (ctrl.touched && ctrl.errors) { ... }`.
- **Cross-field validator on a child control instead of the group.** A validator on `confirmPassword` can't see `password`. Attach group-level validators via the second arg to `fb.group({...}, { validators: [myValidator] })`.
