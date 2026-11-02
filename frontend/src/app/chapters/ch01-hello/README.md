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

### Binding to different form elements

The `[prop]` / `(event)` pattern works for every form element, but **which `prop` and which `event`** depends on the element. Here's the cheat sheet:

| Element                        | Read (bind `[prop]`)        | Write (listen to `event`)         | Value you get                              |
|--------------------------------|------------------------------|------------------------------------|--------------------------------------------|
| `<input type="text">`          | `[value]="s()"`              | `(input)="s.set($event.target.value)"` | string                                 |
| `<input type="number">`        | `[value]="n()"`              | `(input)="n.set(+$event.target.value)"` | **cast with `+`** — it comes back as a string too |
| `<input type="checkbox">`      | `[checked]="b()"`            | `(change)="b.set($event.target.checked)"` | boolean                                |
| `<input type="radio">`         | `[checked]="choice() === 'a'"` | `(change)="choice.set('a')"`     | one radio per possible value               |
| `<input type="date">`          | `[value]="d()"`              | `(input)="d.set($event.target.value)"` | string `'YYYY-MM-DD'` (not a `Date`)   |
| `<textarea>`                   | `[value]="s()"`              | `(input)="s.set($event.target.value)"` | same as text input                     |
| `<select>` (single)            | **don't bind on `<select>`** | `(change)="s.set($event.target.value)"` | string — but see below               |
| `<select multiple>`            | — (see note below)           | `(change)="handleMulti($event)"`   | array of strings                           |

#### `<select>` — three ways, which to pick

For `<select>`, there are three legitimate ways to bind the value. All three work for most cases; they differ in how robust they are to edge cases.

**Option A — `[value]` on `<select>` (simplest, use this by default):**

```html
<select [value]="greetingStyle()" (change)="greetingStyle.set($any($event.target).value)">
  <option value="casual">Casual</option>
  <option value="formal">Formal</option>
</select>
```

Matches the pattern you learned for `<input>`. Works in every modern browser when options are static strings rendered synchronously — which covers 90% of cases.

**Option B — `[selected]` on each `<option>` (bulletproof but verbose):**

```html
<select (change)="greetingStyle.set($any($event.target).value)">
  <option value="casual" [selected]="greetingStyle() === 'casual'">Casual</option>
  <option value="formal" [selected]="greetingStyle() === 'formal'">Formal</option>
</select>
```

Reach for this when Option A misbehaves — specifically, when options are rendered **asynchronously** (loaded from an API inside an `@for` loop) and the `<select>` sees its value before the options exist. In that race, Option A ends up on nothing; Option B stays correct.

**Option C — `[(ngModel)]` (what real Angular code uses):**

```html
<select [(ngModel)]="greetingStyle">
  <option value="casual">Casual</option>
  <option value="formal">Formal</option>
</select>
```

One binding, handles read + write + edge cases. Needs `FormsModule` imported and the signal to be used slightly differently. **Covered in Chapter 07** — don't jump ahead for this.

**For this chapter: use Option A.** It's the natural extension of the `<input>` pattern. Keep Option B in your pocket for async options; expect Option C to replace both once we hit forms.

#### The TypeScript cast noise

You'll notice `$any($event.target).value` everywhere above. That's because `$event.target` is typed as `EventTarget | null` — Angular doesn't know it's an `HTMLInputElement` with a `.value`. Three ways people handle it:

```html
<!-- 1. $any() — escape-hatch cast, concise, most tutorials use this -->
(input)="name.set($any($event.target).value)"

<!-- 2. inline type assertion — more explicit, slightly more typing -->
(input)="name.set(($event.target as HTMLInputElement).value)"

<!-- 3. template reference variable + .value — no cast needed -->
<input #nameEl (input)="name.set(nameEl.value)" />
```

Teams split on which is "best." At Deutsche Bank, expect option 2 or 3 in code review — the explicit cast or the ref variable makes the TS type visible. `$any()` is fine for tutorials but reviewers at strict shops will ask you to replace it.

### Control flow — `@if`, `@for`, `@switch`

Angular's **built-in control flow** is special syntax that lives in templates. It's not JavaScript — it's a mini-language the Angular compiler understands. Introduced in Angular 17 to replace the old `*ngIf`, `*ngFor`, `*ngSwitch` directives (which you'll still meet in older codebases).

#### `@if` — conditional rendering

```html
@if (name()) {
  <p>Hello, {{ name() }}!</p>
} @else {
  <p>Please type your name.</p>
}
```

With multiple branches:

```html
@if (score() >= 90) {
  <span class="grade-a">A</span>
} @else if (score() >= 70) {
  <span class="grade-b">B</span>
} @else {
  <span class="grade-fail">Fail</span>
}
```

**Key rules:**
- The condition goes in `( )`, the body in `{ }`.
- You call signals **inside the condition** with `()` — Angular tracks the signal and re-evaluates when it changes.
- `@else if` and `@else` are optional, each takes a `{ }` body.
- Elements inside the `{ }` block are only created in the DOM when the condition is true. When it flips to false, they're destroyed (not just hidden). If you need "hide but keep in DOM," use `[hidden]="!condition()"` or CSS.

**React parallel:** `@if (x()) { ... } @else { ... }` is Angular's version of `{x ? <A/> : <B/>}` — cleaner because you're not fighting JSX expression rules.

#### `@for` — list rendering

```html
<ul>
  @for (chapter of chapters; track chapter.path) {
    <li>{{ chapter.num }} — {{ chapter.title }}</li>
  } @empty {
    <li>No chapters yet.</li>
  }
</ul>
```

**Key rules:**
- `track <expr>` is **required** — Angular refuses to compile without it. It's the equivalent of React's `key` prop. Pick something stable and unique per item (an `id`, a `path`, etc.). `track $index` is the fallback when items have no unique field.
- `@empty { ... }` renders when the collection is empty. Optional, but very handy — no more `@if (list.length === 0)` wrappers.
- Inside the block you can use these implicit variables: `$index`, `$first`, `$last`, `$even`, `$odd`, `$count`.

Example using an index:

```html
@for (user of users; track user.id; let i = $index) {
  <p>{{ i + 1 }}. {{ user.name }}</p>
}
```

**React parallel:** `@for (x of xs; track x.id)` is `xs.map(x => <... key={x.id}>)`. The `track` is mandatory in Angular; React only warns if you forget `key`.

#### `@switch` — multiple exclusive branches

```html
@switch (greetingStyle()) {
  @case ('casual') { <p>Hey {{ name() }}!</p> }
  @case ('formal') { <p>Good day, {{ name() }}.</p> }
  @default { <p>Hi {{ name() }}.</p> }
}
```

**Key rules:**
- Compared with `===` (strict equality).
- `@default` is optional. If nothing matches and there's no default, nothing renders.
- Use `@switch` for 3+ branches; for 2, `@if`/`@else` reads better.

#### What about `*ngIf` and `*ngFor`?

The old syntax still works and you'll see it in any codebase older than ~late 2023:

```html
<!-- Old -->
<p *ngIf="name()">Hello, {{ name() }}!</p>
<li *ngFor="let c of chapters; trackBy: trackByPath">{{ c.title }}</li>

<!-- New (what we use) -->
@if (name()) { <p>Hello, {{ name() }}!</p> }
@for (c of chapters; track c.path) { <li>{{ c.title }}</li> }
```

The old versions need `CommonModule` or `NgIf`/`NgFor` in the component's `imports`. The new `@`-syntax is **built in** — no import needed. That's half the reason Angular introduced them.

**On the job:** write the new syntax in new files. Match the existing style in old files unless the team is doing a migration.

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

## 3. React / Vue 2 parallel

Angular lines up **much more cleanly with Vue 2's Options API** than with React. Both have a decorator/options object describing a component, a separate `<template>`, scoped styles, and lifecycle hooks. The main differences are signals (newer than Vue 2's reactivity) and TypeScript-first ergonomics.

| Angular | Vue 2 equivalent | React equivalent | Notes |
|---|---|---|---|
| `@Component({...}) class Foo` with `.html` + `.css` files | SFC: `<template>`, `<script>` with `export default { ... }`, `<style scoped>` | `function Foo()` returning JSX | Vue 2 SFC and Angular component files are almost 1:1. React blurs template + logic into one function. |
| `signal(0)` + `.set(1)` | `data() { return { count: 0 } }` + `this.count = 1` | `useState(0)` + `setX(1)` | Vue 2 wraps `data` properties with `Object.defineProperty` reactivity. Angular signals are explicit — you call them. Both update their templates automatically when the value changes. |
| `computed(() => this.name())` | `computed: { greeting() { return \`Hi \${this.name}\` } }` | `useMemo(() => ..., [deps])` | **Nearly identical to Vue 2**. Both auto-track deps — Vue by reading reactive properties, Angular by reading signals. No deps array in either. |
| `(click)="handler()"` | `@click="handler"` (shorthand for `v-on:click`) | `onClick={handler}` | Different punctuation, same wiring. |
| `[value]="name()"` | `:value="name"` (shorthand for `v-bind:value`) | `value={name}` | Vue's `:x` ↔ Angular's `[x]`. Both mean "bind this attribute from state." |
| `[(ngModel)]="x"` | `v-model="x"` | `value={x} onChange={e => setX(e.target.value)}` | **Direct parallel.** Angular's "banana in a box" `[()]` IS Angular's `v-model`. Covered in ch07. |
| `{{ expression }}` | `{{ expression }}` | `{expression}` | Vue and Angular share interpolation syntax exactly. |
| `*ngIf` / `@if` | `v-if` | `{cond && <X/>}` or `cond ? <A/> : <B/>` | Angular's new `@if` + `@else` reads a lot like `v-if` + `v-else`. |
| `*ngFor` / `@for` with `track` | `v-for` with `:key` | `.map()` with `key` | Vue's `:key`, Angular's `track`, React's `key` — same concept, three names. |
| Methods on the class | `methods: { foo() { ... } }` | functions declared in the component body or outside | Angular class methods ≈ Vue `methods`. Access state via `this.something()` in Angular, `this.something` in Vue. |
| `inject(SomeService)` (ch05) | plugins / `provide`/`inject` option | `useContext(SomeContext)` | Angular's DI is far more powerful than Vue 2's inject, but the mental model is similar: components ask for services from a tree. |

**Where Angular is unlike BOTH:**
- **TypeScript is first-class.** Vue 2 can use TS but it's bolted on; Angular was built for it. Types flow into templates — your template errors appear in the IDE.
- **Compile-time templates.** Angular compiles your HTML into generated TS during the build. Vue 2 compiles templates at runtime (unless using the compiler step). This is why Angular needs `imports: [...]` on the component (template compiler needs to know what tags are allowed) but Vue 2 can register components anywhere.
- **Scoped CSS by default.** Vue 2's `<style scoped>` is opt-in. Angular's is on by default — every `.css` sibling of a component is scoped automatically.

**Where Angular is unlike React:**
- CSS scoping just works (no CSS Modules / styled-components needed).
- The HTML tag IS the component (`<app-ch01-hello>` is a first-class element).
- No virtual DOM — Angular updates the real DOM directly via its change-detection pass (and increasingly via signal subscriptions, which skip the pass entirely).

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

Do these in order. Each one changes **only** `ch01-hello.ts` and `ch01-hello.html`. Each exercise lists which theory subsections you need before starting.

### Exercise 1 — add a greeting style selector

**Theory you need:** *Signals*, *Binding to different form elements → `<select>` — three ways*, *`@switch`* (optional, you can also use `if` in the computed).

Add a second signal `greetingStyle` with initial value `'casual'`. Add a `<select>` in the template with two options: `Casual` and `Formal`. When `casual`, `greeting` should produce `Hello, {name}!`. When `formal`, it should produce `Good day, {name}.`

**Starter — in `ch01-hello.ts`:**
```ts
readonly name = signal('world');
readonly greetingStyle = signal<'casual' | 'formal'>('casual');
readonly greeting = computed(() => {
  // use this.name() and this.greetingStyle() here
  // return a string
});
```

**Starter — in `ch01-hello.html`:**
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

- **What good looks like:** Switching the select immediately updates the greeting text with no manual refresh. You did **not** add any explicit "subscribe" or `effect` — the `computed` just re-runs because it reads two signals.
- **Why `signal<'casual' | 'formal'>`:** A union type stops you (and TypeScript) from ever setting it to a stray string. Future-you writing `greetingStyle.set('casuel')` gets a compile error.

### Exercise 2 — character count

**Theory you need:** *Signals (`computed`)*, *Interpolation*.

Add a `<small>` element under the input showing `"{n} characters"`. Use a `computed`, not a method call in the template.

**Starter — in `ch01-hello.ts`:**
```ts
readonly charCount = computed(() => /* return this.name().length */);
```

**Starter — in `ch01-hello.html`, below the `<input>`:**
```html
<small>{{ charCount() }} characters</small>
```

- **Why computed over method:** Methods in templates re-run on **every** change detection cycle (any click, any typed key anywhere). Computed signals cache and only recompute when their inputs change. **Code review will flag `{{ someMethod() }}` in templates** at any experienced shop.
- **What good looks like:** The count updates as you type, and there's a `computed` in the class — not a getter, not a method.

### Exercise 3 — rename the component to use a team prefix

**Theory you need:** *The three pieces of template syntax* (just the `selector` concept), *Common pitfalls → Confusing `selector` with the route*.

Pretend you're at Deutsche Bank and the team prefix is `db-` instead of `app-`. Change **only** the `selector` in the `@Component({...})` decorator from `app-ch01-hello` to `db-ch01-hello`. Save. Reload the page.

- **What good looks like:** Yes, it still works — because the router loads this component by its **class** (`Ch01Hello`), not by its selector. The selector only matters if you want to embed `<db-ch01-hello>` inside another template.
- **Lesson:** The selector is for *embedding*, not for *routing*. This trips up every React developer at least once.
- **Side note:** You usually don't change selectors mid-project at a real company — Angular lints enforce one prefix per app. This exercise is a thought experiment to make the selector/route distinction click.

### Exercise 4 — smart toggle button (uses `@if`)

**Theory you need:** *Control flow → `@if`*, *Event binding*.

Right now the Clear button always says "Clear" and always empties the name. Build a smarter button:

- When `name()` is **non-empty**, show a button labeled `Clear` that empties `name`.
- When `name()` is **empty**, show a button labeled `Reset` that puts `name` back to `'world'`.

**Starter — in `ch01-hello.ts`:**
```ts
clear() {
  this.name.set('');
}
reset() {
  this.name.set('world');
}
```

**Starter — in `ch01-hello.html`, replace the existing `<button>`:**
```html
@if (name()) {
  <button type="button" (click)="clear()">Clear</button>
} @else {
  <button type="button" (click)="reset()">Reset</button>
}
```

- **What good looks like:** Type a name → button says "Clear" and empties the field when clicked. Field now empty → button flips to "Reset" and refills `'world'` when clicked. The whole thing is reactive with zero manual DOM work.
- **Try also:** Can you do it with a single `<button>` whose label is a `computed` and whose click handler decides what to do? Both are legitimate; the `@if` version makes the two states structurally visible, the computed version is more compact. Both come up in real codebases.

---

## 6. Common pitfalls

- **Forgetting the `()` when reading a signal.** `{{ name }}` prints `function signal() { ... }`. You need `{{ name() }}`. The compiler won't warn you — it's valid syntax, just useless output.
- **Mutating a signal's value directly.** Signals are not stores you mutate — you call `.set(newValue)` or `.update(prev => newValue)`. Writing `this.name = 'foo'` replaces the signal with a plain string and breaks reactivity.
- **Putting method calls in the template.** `{{ expensiveMethod() }}` runs on **every** change detection cycle, not just when its inputs change. Use `computed` instead.
- **Confusing `selector` with the route.** The route (in `app.routes.ts`) decides when a component is mounted at a URL. The selector decides what HTML tag embeds it inside another template. They are unrelated.
- **Leaving `app-` as the prefix in production code.** `app-` is fine for tutorials. In real projects, use the team prefix (`db-`, `lx-`, etc.) consistently.
- **Forgetting `track` in `@for`.** The compiler fails hard here with a clear error — but it's the single most common thing a React dev forgets on day one. Just build the muscle memory.
- **Using old `*ngIf` / `*ngFor` in new files.** They still work, but need `CommonModule` or `NgIf`/`NgFor` imported, and most reviewers at modern shops will nudge you toward the new `@`-syntax. Mix them only when matching the existing style of an old file.

---

## Next

Chapter 02 — Components & templates. We'll build components that *talk to each other* via `input()` and `output()` (Angular's answer to React props and callback props). Also content projection, which has no React equivalent at all.
