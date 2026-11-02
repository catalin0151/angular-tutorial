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
this.form.reset();                                // all back to initial
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

### Exercise 1 — add an age field with min/max
Add `age: [18, [Validators.min(18), Validators.max(120)]]`. Show the "must be 18+" error when below.

### Exercise 2 — custom async-looking validator
Write `usernameUnique(takenNames: string[])` as a factory returning a validator. Attach to a new `username` control. Preseed with `['alice', 'bob']`.

### Exercise 3 — a nested group for address
Add a `address` FormGroup with `street`, `city`, `zip`. Bind with `formGroupName="address"`. Make `zip` match `^\d{5}$`.

### Exercise 4 — stretch — subscribe to `valueChanges` with debounce
Log the current form value to console whenever it changes, debounced by 300ms. Use RxJS: `this.form.valueChanges.pipe(debounceTime(300)).subscribe(...)`.

---

## 6. Pitfalls

- **Forgot `ReactiveFormsModule` import.** Nothing works. Error is about unknown bindings.
- **Using `FormBuilder` instead of `NonNullableFormBuilder`.** You get `string | null` everywhere, which forces `?? ''` all over your code.
- **`formControlName` without `[formGroup]` on a parent form tag.** Error about the control not being found.
- **Reading `this.form.value` when controls are disabled.** Disabled controls are missing from `.value`. Use `.getRawValue()`.
- **Mutating a form after setup from a different context without `markAsTouched`.** Changes won't show errors until user interacts. Call `.markAllAsTouched()` on submit if invalid.
- **Treating the form object as a signal.** It's not. Use `valueChanges` + `toSignal` if you want signal interop (ch10).
