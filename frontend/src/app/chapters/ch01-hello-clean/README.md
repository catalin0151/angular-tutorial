# Chapter 01 (clean) — Hello Angular

> **Pristine starter copy.** Identical to Chapter 01's starting state. Use this folder to practice the exercises without touching your original work. Everything here uses the suffix `-clean` so routes and class names don't collide (route: `/ch01-hello-clean`, class: `Ch01HelloClean`).

**Goal:** Understand how a single Angular component is wired, what makes it different from a React/Vue component, and what Angular 20's naming/structure conventions are *before* you write anything bigger.

---

## 1. Theory

### What is a component?

An Angular component is a **class with a decorator that attaches a template**. Three things always go together:

- **A TypeScript class** — holds state and methods.
- **A template** — HTML with Angular's special syntax (`{{ }}`, `[prop]`, `(event)`, `@if`, `@for`).
- **A CSS file** — styles that are **scoped to that component by default**.

```ts
@Component({
  selector: 'app-ch01-hello-clean',
  templateUrl: './ch01-hello-clean.html',
  styleUrl: './ch01-hello-clean.css',
})
export class Ch01HelloClean { /* state + methods */ }
```

Note: no `standalone: true`. **In Angular 20, standalone is the default.** Opt out by writing `standalone: false` only if working with legacy `NgModule`-based code.

### The three pieces of template syntax

| Syntax           | Means                           | Example                                   |
|------------------|---------------------------------|-------------------------------------------|
| `{{ expr }}`     | **Interpolation** — show a value | `<p>{{ greeting() }}</p>`                 |
| `[attr]="expr"`  | **Property binding** — set a DOM/component property | `<input [value]="name()" />` |
| `(event)="fn()"` | **Event binding** — listen to a DOM event | `<button (click)="clear()">` |

`[(ngModel)]="x"` (two-way binding) is covered in ch07.

### Signals

```ts
readonly name = signal('world');     // writable
readonly greeting = computed(() => `Hello, ${this.name()}!`);  // derived, read-only

// read:  this.name()           ← CALL it, like a getter
// write: this.name.set('foo')  ← or .update(fn) for a transform
```

### Binding to different form elements

The `[prop]` / `(event)` pattern applies to every form element, but **which `prop` and which `event`** depends on the element:

| Element                        | Read (bind `[prop]`)        | Write (listen to `event`)         | Value you get                              |
|--------------------------------|------------------------------|------------------------------------|--------------------------------------------|
| `<input type="text">`          | `[value]="s()"`              | `(input)="s.set($event.target.value)"` | string                                 |
| `<input type="number">`        | `[value]="n()"`              | `(input)="n.set(+$event.target.value)"` | cast with `+` — it comes back as string |
| `<input type="checkbox">`      | `[checked]="b()"`            | `(change)="b.set($event.target.checked)"` | boolean                                |
| `<input type="date">`          | `[value]="d()"`              | `(input)="d.set($event.target.value)"` | string `'YYYY-MM-DD'`                 |
| `<textarea>`                   | `[value]="s()"`              | `(input)="s.set($event.target.value)"` | string                                 |
| `<select>`                     | see below                    | see below                          | string                                     |

#### `<select>` — three ways

**Option A — `[value]` on `<select>` (simplest, default pick):**
```html
<select [value]="greetingStyle()" (change)="greetingStyle.set($any($event.target).value)">
  <option value="casual">Casual</option>
  <option value="formal">Formal</option>
</select>
```

**Option B — `[selected]` on each `<option>` (bulletproof for async option lists):**
```html
<select (change)="greetingStyle.set($any($event.target).value)">
  <option value="casual" [selected]="greetingStyle() === 'casual'">Casual</option>
  <option value="formal" [selected]="greetingStyle() === 'formal'">Formal</option>
</select>
```

**Option C — `[(ngModel)]` (what real code uses, covered in ch07):**
```html
<select [(ngModel)]="greetingStyle">
  <option value="casual">Casual</option>
  <option value="formal">Formal</option>
</select>
```

**For this chapter: Option A.**

#### Casting the TS noise

Three options for the `$event.target` cast:
```html
(input)="name.set($any($event.target).value)"                    <!-- 1. $any() -->
(input)="name.set(($event.target as HTMLInputElement).value)"    <!-- 2. inline cast -->
<input #nameEl (input)="name.set(nameEl.value)" />               <!-- 3. template ref -->
```

Real-world teams prefer option 2 or 3. `$any()` is fine for tutorials.

### Control flow — `@if`, `@for`, `@switch`

#### `@if`
```html
@if (name()) {
  <p>Hello, {{ name() }}!</p>
} @else {
  <p>Please type your name.</p>
}
```

- Condition in `( )`, body in `{ }`.
- `@else if` and `@else` are optional.
- Elements inside `{ }` are **destroyed** when the condition flips false (not just hidden).

#### `@for`
```html
@for (chapter of chapters; track chapter.path) {
  <li>{{ chapter.num }} — {{ chapter.title }}</li>
} @empty {
  <li>No chapters yet.</li>
}
```

- `track` is **required** — compile error if missing. Pick something stable (`id`, `path`, etc.).
- `@empty { ... }` renders when the collection is empty.
- Implicit vars: `$index`, `$first`, `$last`, `$even`, `$odd`, `$count`. Rename with `let i = $index`.

#### `@switch`
```html
@switch (greetingStyle()) {
  @case ('casual') { <p>Hey {{ name() }}!</p> }
  @case ('formal') { <p>Good day, {{ name() }}.</p> }
  @default         { <p>Hi {{ name() }}.</p> }
}
```

- Strict equality (`===`).
- `@default` optional.

#### Legacy `*ngIf` / `*ngFor`
Still work, need `CommonModule`/`NgIf`/`NgFor` imported. New code uses `@`-syntax (no import).

---

## 2. Why files are named/structured this way

**Angular 20 convention (what `ng generate` produces today):** `ch01-hello-clean.ts`, class `Ch01HelloClean`, no `.component` suffix.

**Old convention (Angular 2–19):** `ch01-hello.component.ts`, class `Ch01HelloComponent`.

Existing DB codebases will almost certainly use the **old** convention. New files you add to an old repo should match it. We use the new one here because it's what the CLI gives us.

Other rules (same in both conventions):
- Kebab-case filenames.
- PascalCase class names.
- One component per folder.
- Selector prefix (`app-`, `db-`, etc.) — hyphen is a framework rule, prefix is team preference.

---

## 3. React / Vue 2 parallel

Angular lines up **much more cleanly with Vue 2's Options API** than with React.

| Angular | Vue 2 | React | Notes |
|---|---|---|---|
| `@Component({...}) class Foo` + separate `.html`/`.css` | SFC: `<template>`, `<script>` with `export default`, `<style scoped>` | `function Foo()` returning JSX | Vue 2 SFC ≈ Angular component files. |
| `signal(0)` + `.set(1)` | `data() { return { n: 0 } }` + `this.n = ...` | `useState(0)` + `setN(...)` | Angular reads with `n()`. Vue direct, React setter. |
| `computed(() => this.n())` | `computed: { ... }` | `useMemo(() => ..., [deps])` | Angular and Vue both auto-track deps. |
| `(click)="handler()"` | `@click="handler"` | `onClick={handler}` | Same wiring, different punctuation. |
| `[value]="x()"` | `:value="x"` | `value={x}` | Vue's `:x` ↔ Angular's `[x]`. |
| `[(ngModel)]="x"` | `v-model="x"` | manual `value`+`onChange` | **Direct Vue parallel** — covered ch07. |
| `{{ expr }}` | `{{ expr }}` | `{expr}` | Vue and Angular share exact syntax. |
| `@if` | `v-if` | `{cond && <X/>}` | Angular's `@if`+`@else` reads like `v-if`+`v-else`. |
| `@for ... track` | `v-for ... :key` | `.map()` with `key` | Vue's `:key` ↔ Angular's `track`. |

**Where Angular is unlike BOTH:**
- TypeScript is first-class, flows into templates.
- Templates compile at build-time → requires `imports: [...]` on the component.
- Scoped CSS by default (Vue 2 opt-in, React needs a lib).

---

## 4. Walkthrough

Open and read:
1. `ch01-hello-clean.ts` — the class with signal + computed + clear method.
2. `ch01-hello-clean.html` — one input, one output paragraph, one button.
3. `ch01-hello-clean.css` — scoped styling.

Then navigate to http://localhost:4200/ch01-hello-clean and watch the greeting update as you type.

---

## 5. Exercises

### Exercise 1 — add a greeting style selector

**Theory you need:** *Signals*, *`<select>` — three ways*, *`@switch`*.

Add a signal `greetingStyle` with initial value `'casual'`. Add a `<select>` in the template with two options (`Casual`, `Formal`). When `casual`, `greeting` → `Hello, {name}!`. When `formal` → `Good day, {name}.`

**Starter — `ch01-hello-clean.ts`:**
```ts
readonly name = signal('world');
readonly greetingStyle = signal<'casual' | 'formal'>('casual');
readonly greeting = computed(() => {
  // use this.name() and this.greetingStyle() here
  // return a string
});
```

**Starter — `ch01-hello-clean.html`:**
```html
<label>
  Style
  <select
    [value]="greetingStyle()"
    (change)="greetingStyle.set($any($event.target).value)"
  >
    <option value="casual">Casual</option>
    <option value="formal">Formal</option>
  </select>
</label>
```

- **What good looks like:** switching the select immediately updates the greeting with no manual refresh.

### Exercise 2 — character count

**Theory you need:** *`computed`*, *Interpolation*.

Add a `<small>` under the input showing `"{n} characters"`. Use a `computed`, not a method.

**Starter — `ch01-hello-clean.ts`:**
```ts
readonly charCount = computed(() => /* return this.name().length */);
```

**Starter — `ch01-hello-clean.html`:**
```html
<small>{{ charCount() }} characters</small>
```

- **Why computed over method:** method calls in templates re-run every change detection cycle. Code review will flag `{{ someMethod() }}` at any experienced shop.

### Exercise 3 — rename the selector

Change the `selector` from `app-ch01-hello-clean` to `db-ch01-hello-clean`. Reload — the chapter still renders. **Why:** the router loads this component by its class, not its selector. The selector only matters for embedding `<db-ch01-hello-clean>` inside another template.

### Exercise 4 — smart toggle button (uses `@if`)

**Theory you need:** *Control flow → `@if`*, *Event binding*.

Build a smarter button:
- When `name()` is non-empty → "Clear" button that empties the field.
- When `name()` is empty → "Reset" button that puts `name` back to `'world'`.

**Starter — `ch01-hello-clean.ts`:**
```ts
clear() { this.name.set(''); }
reset() { this.name.set('world'); }
```

**Starter — `ch01-hello-clean.html`, replace the existing `<button>`:**
```html
@if (name()) {
  <button type="button" (click)="clear()">Clear</button>
} @else {
  <button type="button" (click)="reset()">Reset</button>
}
```

**Try also:** solve it with a single button whose label is a `computed` and whose click handler decides what to do.

---

## 6. Common pitfalls

- **Forgetting `()` when reading a signal.** `{{ name }}` prints the function; you need `{{ name() }}`.
- **Mutating a signal directly** (`this.name = 'x'`) breaks reactivity. Use `.set()` / `.update()`.
- **Method calls in `{{ }}`** run on every change detection cycle. Use `computed`.
- **Confusing selector with the route.** Route is in `app.routes.ts`, selector is for embedding.
- **Forgetting `track` in `@for`** — compiler fails.
- **Using `*ngIf` / `*ngFor` in new files** — works but needs `CommonModule`. Modern code uses `@if`/`@for`.
