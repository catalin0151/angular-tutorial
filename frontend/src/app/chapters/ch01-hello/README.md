# Chapter 01 — Hello Angular

**Goal:** Understand how a single Angular component is wired, what makes it different from a React component, and what Angular 20's naming/structure conventions are *before* you write anything bigger.

---

## 1. Theory

### What is a component?

An Angular component is a **class with a decorator that attaches a template**. Three things always go together:

- **A TypeScript class** — holds state and methods.
- **A template** — HTML with Angular's special syntax (`{{ }}`, `[prop]`, `(event)`, `@if`, `@for`).
- **A CSS file** — styles that are **scoped to that component by default**.

The decorator `@Component({...})` glues them together and tells Angular: "when you see this HTML tag, render this class."

```ts
@Component({
  selector: 'app-ch01-hello',       // the custom HTML tag
  templateUrl: './ch01-hello.html',
  styleUrl: './ch01-hello.css',
})
export class Ch01Hello { /* state + methods */ }
```

Note: there's no `standalone: true` in the decorator. **In Angular 20, standalone is the default.** You only need to opt out by writing `standalone: false` if you're working with legacy `NgModule`-based code — which you'll rarely do in new projects.

### The three pieces of template syntax

| Syntax           | Means                           | Example                                   |
|------------------|---------------------------------|-------------------------------------------|
| `{{ expr }}`     | **Interpolation** — show a value | `<p>{{ greeting() }}</p>`                 |
| `[attr]="expr"`  | **Property binding** — set a DOM/component property | `<input [value]="name()" />` |
| `(event)="fn()"` | **Event binding** — listen to a DOM event | `<button (click)="clear()">` |

That's 90% of what you'll write in templates. There's also `[(ngModel)]="x"` (two-way binding — covered in ch07) but you can go a long way without it.

### Signals (the modern state primitive)

A `signal` is a reactive value. When it changes, every part of the template that reads it updates — automatically.

```ts
readonly name = signal('world');     // writable
readonly greeting = computed(() => `Hello, ${this.name()}!`);  // derived, read-only

// read:  this.name()           ← CALL it, like a getter
// write: this.name.set('foo')  ← or .update(fn) for a transform
```

Signals are the direction Angular is moving. You'll still see `BehaviorSubject` and plain class fields in older code, but new code should prefer signals.

---

## 2. Why files are named/structured this way

**Angular 20 changed the convention.** This is one of the few areas where "it depends what codebase you're in."

### The new convention (Angular 20+, what `ng generate` produces today)

| File        | Example                     |
|-------------|-----------------------------|
| Component   | `ch01-hello.ts`             |
| Template    | `ch01-hello.html`           |
| Styles      | `ch01-hello.css`            |
| Service     | `user.ts`                   |
| Pipe        | `highlight.ts`              |
| Directive   | `tooltip.ts`                |
| Class name  | `Ch01Hello` (no suffix)     |

The reasoning: the folder name already tells you what the file is (`ch01-hello/ch01-hello.ts` is obviously a component — you don't need `.component.ts` to spell it out). Keeps file listings shorter.

### The old convention (Angular 2 through 19)

| File        | Example                     |
|-------------|-----------------------------|
| Component   | `ch01-hello.component.ts`   |
| Template    | `ch01-hello.component.html` |
| Styles      | `ch01-hello.component.css`  |
| Service     | `user.service.ts`           |
| Pipe        | `highlight.pipe.ts`         |
| Directive   | `tooltip.directive.ts`      |
| Class name  | `Ch01HelloComponent`        |

### What this means for you on the job

- **Any existing Deutsche Bank repo started before mid-2025 will use the OLD convention.** You can't rename files in a running production app without breaking imports. You'll read and write `.component.ts`, `UserService`, etc. daily.
- **New files you add to an old repo should match the old convention.** Code review will reject mixed naming.
- **If the team scaffolds a brand-new app, they might go either way.** Some teams explicitly configure the Angular style guide to keep the old convention for consistency. Others embrace the new one.

**For this tutorial we use the new convention** because that's what `ng generate` produces today. You'll see both styles in your career — the mental model is identical, only the filenames change.

### Rules that are the same in both conventions

| Rule | Enforcement |
|---|---|
| **Kebab-case filenames** — `ch01-hello.ts`, not `Ch01Hello.ts` | **Best practice**, enforced by lint |
| **PascalCase class names** — `Ch01Hello` | **Best practice**, enforced by lint |
| **One component per folder** — folder named after the component, holding its `.ts` + `.html` + `.css` | **Team preference** (very widely followed, but technically you can inline the template) |
| **Selector prefix** — `app-` or a team prefix like `db-` | Angular *requires* a hyphenated custom element name (framework rule). The prefix prevents collisions across libraries (**team preference**). |
| **Separate template file (`templateUrl`) vs. inline (`template`)** | **Team preference** — both are valid. The CLI defaults to separate files for new components. |

---

## 3. React/Vue parallel

| Angular | React equivalent | Notes |
|---|---|---|
| `@Component({...}) class Foo` | `function Foo()` returning JSX | Angular keeps the "which HTML tag is this" explicit via `selector`; React just uses the function name at the call site. |
| `signal(0)` + `.set(1)` | `useState(0)` + `setX(1)` | **Nearly identical semantics**, but a signal can be read from anywhere (services, computed values), not just from inside a component. That's a bigger deal than it sounds. |
| `computed(() => ...)` | `useMemo(() => ..., [deps])` | Angular **auto-tracks dependencies** — no deps array. If you read `name()` inside the computed, it re-runs when `name` changes. Simpler and less error-prone than `useMemo`. |
| `(click)="handler()"` | `onClick={handler}` | Angular puts the event name in parentheses, React in camelCase props. Semantically the same. |
| `[value]="name()"` | `value={name}` | Property binding. Note Angular's brackets `[ ]` → data flows **into** the element. |
| `[(ngModel)]="x"` | `value={x} onChange={e => setX(e.target.value)}` | Angular compresses two-way binding into one syntax — the "banana in a box" `[()]`. Covered in ch07. |

**Where there's no clean parallel:**
- CSS being scoped-by-default per component (React needs CSS Modules or styled-components; Angular just does it).
- The HTML tag being a first-class identifier (`<app-ch01-hello>` IS the component; React has nothing like this, it mounts by function call).

---

## 4. Walkthrough — read the files I wrote

Open these three files and read them in order:

1. **`ch01-hello.ts`** — the class. Note:
   - The `@Component` decorator and its three keys (no `standalone: true`, no `imports: []` because we don't use any other components in the template).
   - Two signals: a writable `name` and a derived `greeting`.
2. **`ch01-hello.html`** — the template. Note:
   - `[value]="name()"` — property binding, reading the signal (notice the `()`).
   - `(input)="name.set($any($event.target).value)"` — event binding, writing the signal. The `$any()` cast is Angular's escape hatch for sketchy TypeScript — we'll replace it with a cleaner approach in ch07.
   - `{{ greeting() }}` — interpolation.
   - `(click)="clear()"` — event binding to a method.
3. **`ch01-hello.css`** — plain CSS, **scoped to this component only**. The `.chapter` class here will not collide with any other `.chapter` elsewhere.

Then open the app in the browser (see the Verification step at the end of this message) and watch the greeting update as you type.

---

## 5. Exercises

Do these in order. Each one changes **only** `ch01-hello.ts` and `ch01-hello.html`.

### Exercise 1 — add a second signal

Add a signal `greetingStyle` with initial value `'casual'`. Add a `<select>` in the template with two options: `casual` and `formal`. When `casual`, `greeting` should produce `Hello, {name}!`. When `formal`, it should produce `Good day, {name}.`

- **Hint:** `greeting` is a `computed`. It can read both signals.
- **What good looks like:** Switching the select immediately updates the greeting text with no manual refresh. You did **not** add any explicit "subscribe" or `effect` — the `computed` just re-runs because it read two signals.

### Exercise 2 — character count

Add a small `<small>` under the input showing `"{n} characters"`. Use a `computed`, not a method call in the template.

- **Why computed over method:** Methods in templates re-run on every change detection cycle. Computed signals cache and only recompute when their inputs change. **Code review will flag `{{ someMethod() }}` in templates** at any experienced shop.
- **What good looks like:** The count updates as you type, and there's a `computed` in the class.

### Exercise 3 — rename the component to use a team prefix

Pretend you're at Deutsche Bank and the team prefix is `db-` instead of `app-`. Change **only** the `selector` from `app-ch01-hello` to `db-ch01-hello`. Does the app still work?

- **What good looks like:** Yes, it still works — because the router loads this component by its **class**, not its selector. The selector only matters if you want to embed `<db-ch01-hello>` inside another template.
- **Lesson:** The selector is for *embedding*, not for *routing*. This trips up every React developer at least once.

### Exercise 4 — stretch — smart toggle button

Add a second button labeled "Reset" that puts the name back to `'world'` (not empty like "Clear"). Then try to combine both into one button that toggles between "Reset" (when name is empty) and "Clear" (when name is non-empty).

- **Hint:** You'll need `@if` in the template.
- **What good looks like:** One button whose label and behavior change based on `name()`.

---

## 6. Common pitfalls

- **Forgetting the `()` when reading a signal.** `{{ name }}` prints `function signal() { ... }`. You need `{{ name() }}`. The compiler won't warn you — it's valid syntax, just useless output.
- **Mutating a signal's value directly.** Signals are not stores you mutate — you call `.set(newValue)` or `.update(prev => newValue)`. Writing `this.name = 'foo'` replaces the signal with a plain string and breaks reactivity.
- **Putting method calls in the template.** `{{ expensiveMethod() }}` runs on **every** change detection cycle, not just when its inputs change. Use `computed` instead.
- **Confusing `selector` with the route.** The route (in `app.routes.ts`) decides when a component is mounted at a URL. The selector decides what HTML tag embeds it inside another template. They are unrelated.
- **Leaving `app-` as the prefix in production code.** `app-` is fine for tutorials. In real projects, use the team prefix (`db-`, `lx-`, etc.) consistently.

---

## Next

Chapter 02 — Components & templates. We'll build components that *talk to each other* via `input()` and `output()` (Angular's answer to React props and callback props). Also content projection, which has no React equivalent at all.
