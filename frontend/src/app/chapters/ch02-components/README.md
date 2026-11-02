# Chapter 02 — Components & templates

**Goal:** Learn how two components talk to each other. Three concepts: passing data **down** with `input()`, sending events **up** with `output()`, and projecting arbitrary content from the parent into a slot in the child with `<ng-content>`.

---

## 1. Theory

### Two components in one chapter

Chapter 01 had a single component. Real apps are trees of components. The **parent** passes data down; the **child** notifies the parent when something happens. Two separate mechanisms, one for each direction.

- `input()` — **parent → child.** Data flow in.
- `output()` — **child → parent.** Event flow out.
- `<ng-content>` — **parent gives the child HTML to render.** Like React's `children`.

### `input()` — receiving data from the parent

In the child class:

```ts
import { Component, input } from '@angular/core';

@Component({ /* ... */ })
export class UserCard {
  readonly name = input.required<string>();          // must be set
  readonly role = input<string>('Unknown');          // optional, with default
}
```

In the parent template:

```html
<app-user-card [name]="user.name" [role]="user.role" />
```

- `input.required<T>()` — the parent **must** pass this prop. Forgetting is a compile error.
- `input<T>(defaultValue)` — optional, uses the default if not passed.
- The child reads the value with `name()` (**call it like a signal**, because that's what it is). You can also use it in `computed`s inside the child.
- The parent uses `[attr]="expr"` property binding — same `[ ]` syntax as DOM props in Chapter 01.

**You will also see this older syntax in legacy code:**

```ts
@Input() name = '';
@Input({ required: true }) role!: string;
```

The decorator-style `@Input()` has been around since Angular 2. It still works but gives you a plain class field, not a signal — so you can't use it in `computed`s cleanly. **New code should use `input()`**; mix only when matching existing files.

### `output()` — notifying the parent

In the child class:

```ts
import { Component, output } from '@angular/core';

@Component({ /* ... */ })
export class UserCard {
  readonly greet = output<void>();                   // no payload
  readonly scoreChanged = output<number>();          // with payload

  sayHi() {
    this.greet.emit();                               // fire the event
  }

  updateScore(n: number) {
    this.scoreChanged.emit(n);                       // fire with data
  }
}
```

In the parent template:

```html
<app-user-card
  (greet)="onGreet(user)"
  (scoreChanged)="handleScore($event)"
/>
```

- `output<T>()` creates an **event stream** the parent can subscribe to with `(eventName)="handler($event)"`.
- `$event` inside the handler is the payload the child passed to `.emit(...)`.
- For `output<void>()`, don't use `$event` — there's nothing to pass.
- Event names are **not DOM events** — they're custom. `greet` fires only when the child's code calls `.emit()`.

**React parallel:** `output()` is a callback prop that your parent happens to pass as if it were a DOM event listener. In React you'd write `<UserCard onGreet={handleGreet} />`. Angular inverts this: the child declares the event, the parent listens with the same `(event)="handler()"` syntax used for `(click)`.

**Vue 2 parallel:** this is `this.$emit('greet')` + `this.$emit('scoreChanged', n)` from the child. In the parent: `<user-card @greet="handler" @score-changed="handleScore($event)" />`. Same mental model exactly — the child declares an event, the parent listens by name, the payload arrives as `$event`. The two things to adjust: Angular uses `(name)` instead of `@name`, and Angular keeps event names in `camelCase` instead of Vue 2's `kebab-case`.

**Legacy syntax you'll meet in old code:**

```ts
@Output() greet = new EventEmitter<void>();
```

Same semantics. New code uses `output()`.

### Content projection — `<ng-content>`

Sometimes you don't want the parent to pass **data**, you want it to pass **HTML**. Example: a reusable `Panel` component that wraps whatever markup the parent gives it:

Child template (`panel.html`):

```html
<section class="panel">
  <h2>{{ title() }}</h2>
  <div class="panel-body">
    <ng-content />
  </div>
</section>
```

Parent usage:

```html
<app-panel title="Team">
  <p>Any HTML or components here get rendered inside the panel body.</p>
  <app-user-card [name]="'Alice'" [role]="'Trader'" />
</app-panel>
```

- `<ng-content />` is the **slot** where the parent's children land.
- The parent sees `<app-panel>` as if it were a container, writes HTML inside its opening/closing tags, and the child decides where that content goes.

**React parallel:** this is `props.children`. `<ng-content/>` is exactly where you'd put `{children}` in React.

**Vue 2 parallel:** this is `<slot/>`. Named slots work the same way — Vue uses `<slot name="header"/>` + parent-side `<template slot="header">`, Angular uses `<ng-content select="[slot=header]"/>` + parent-side `<h2 slot="header">`. Nearly identical, slightly different syntax.

**Multiple slots** — if you need to project into different places (e.g., a header and a footer), use `select`:

```html
<section class="panel">
  <header><ng-content select="[slot=header]" /></header>
  <main><ng-content /></main>
  <footer><ng-content select="[slot=footer]" /></footer>
</section>
```

Parent:

```html
<app-panel>
  <h2 slot="header">Team</h2>
  <p>Main content.</p>
  <button slot="footer">Save</button>
</app-panel>
```

### Wiring: how the parent "imports" a child

In Chapter 01, our standalone component had no `imports` on the decorator because its template used only built-in syntax. **The moment the parent template contains `<app-user-card />`, the parent must import the child in its decorator:**

```ts
import { UserCard } from './user-card/user-card';
import { Panel } from './panel/panel';

@Component({
  selector: 'app-ch02-components',
  imports: [UserCard, Panel],                        // ← both children listed
  templateUrl: './ch02-components.html',
  styleUrl: './ch02-components.css',
})
export class Ch02Components { /* ... */ }
```

Forget this and you'll see a compiler error like **"'app-user-card' is not a known element."** That error is almost always a missing import.

**React parallel:** React resolves components by lexical scope — if you `import` the component at the top of the file, you can use `<UserCard/>` in JSX. Angular needs the extra `imports: [UserCard]` on the decorator because the template is a separate file compiled by a different pass — the TS `import` only brings the symbol into scope, not into the template context.

**Vue 2 parallel:** this is the `components: { UserCard, Panel }` option on the parent — Angular's `imports` and Vue 2's `components` do the same job for the same reason (telling the template compiler which custom tags are legal). The muscle memory from "I used a child tag but forgot to register it" transfers directly.

### `$event` and event payloads

You've already seen `$event` in Chapter 01 inside `(input)="name.set($any($event.target).value)"`. In **DOM** event bindings `$event` is the browser's event object. In **component** event bindings (an `output()` from a child), `$event` is whatever the child passed to `.emit()`.

```html
<!-- DOM event: $event is a KeyboardEvent -->
<input (keydown)="handle($event)" />

<!-- Component event: $event is whatever the child emitted -->
<app-user-card (scoreChanged)="setScore($event)" />
```

Same syntax, different source. Angular doesn't distinguish because from the parent's point of view, both are just "something fired."

### `@if ... as who` — binding a value to a local

You'll see this new line in the chapter template:

```html
@if (lastGreeted(); as who) {
  <p>Last greeted: {{ who }}</p>
}
```

The `; as who` part captures the truthy value of the condition into a local called `who`, available inside the block. Useful when the signal returns `string | null` — once past the `@if`, `who` is narrowed to `string`.

Same mechanic exists on `@for`:

```html
@for (user of users(); track user.id; let i = $index) {
  <p>{{ i + 1 }} — {{ user.name }}</p>
}
```

---

## 2. Why files are named/structured this way

### One component per folder — now applied to child components

Chapter 01 had a single component in `ch01-hello/`. This chapter has three components (`Ch02Components`, `UserCard`, `Panel`) living in a nested layout:

```
ch02-components/
├── ch02-components.ts        ← the parent (routed from app.routes.ts)
├── ch02-components.html
├── ch02-components.css
├── user-card/
│   ├── user-card.ts
│   ├── user-card.html
│   └── user-card.css
└── panel/
    ├── panel.ts
    ├── panel.html
    └── panel.css
```

- **Why nest children under the parent?** Because `UserCard` and `Panel` are only used inside this chapter. Keeping them colocated means `rm -rf ch02-components/` deletes everything cleanly. If a child becomes used by multiple chapters, promote it to `src/app/shared/`.
- **Rule of thumb (team preference):** colocate until there are two consumers, then promote. Don't preemptively put everything in `shared/`.

### Selectors with the team prefix again

Every component selector starts with `app-` here (or your team's prefix like `db-`). This is enforced by Angular's lint rules — a selector without a prefix will fail CI at most shops.

---

## 3. React / Vue 2 parallel

Parent-child communication is the area where **Angular and Vue 2 are nearly 1:1** — both have declared props, both have declared events, both have content slots. React is the odd one out, folding everything into function-arg props.

| Angular | Vue 2 equivalent | React equivalent | Notes |
|---|---|---|---|
| `input.required<string>()` | `props: { name: { type: String, required: true } }` | TS prop `name: string` | Vue 2 and Angular both declare props with type + required. Angular is TS-first; Vue 2's prop validators are runtime (dev-mode warnings). |
| `input<string>('Unknown')` | `props: { role: { type: String, default: 'Unknown' } }` | `name = 'Unknown'` default | Same shape, different syntax. |
| `[name]="user.name"` on parent | `:name="user.name"` on parent | `name={user.name}` as a prop | Vue's `:prop` ↔ Angular's `[prop]`. The pattern (and even the brackets-vs-colon distinction) is similar. |
| `output<T>()` + `.emit(payload)` | `this.$emit('eventName', payload)` from child | `props.onEventName(payload)` callback | **Angular and Vue 2 share the event-emitter mental model.** React passes a function down and the child calls it; Vue and Angular let the child declare an event stream and the parent listens by name. |
| Parent: `(greet)="handler($event)"` | Parent: `@greet="handler"` or `@greet="handler($event)"` | Parent: `<Child onGreet={handler} />` | Vue uses `@` for events, Angular uses `()`. Both pass the emitted value as `$event`. |
| `<ng-content/>` | `<slot/>` | `{props.children}` | Vue and Angular share the "slot" terminology exactly. React's `children` is the same idea. |
| `<ng-content select="[slot=header]"/>` | `<slot name="header"/>` + `<template slot="header">...</template>` | multiple props: `header`, `footer`, `children` | Vue has named slots; Angular has CSS-selector slots. The concept is the same. |
| `imports: [UserCard]` on parent decorator | `components: { UserCard }` on parent | `import { UserCard }` at top of file | **Vue 2 Options API has the exact equivalent** — a `components: {...}` list on the parent. Angular needs this because templates are compiled separately. |

**Where Angular differs from Vue 2:**
- Angular's `output()` is a signal-era API; the Vue 2 equivalent (`$emit`) is called as a method inside the handler. Semantically identical, syntactically different.
- Angular reads inputs as signals: `name()` (with parens). Vue 2 reads props as plain properties: `this.name`. Mental shift to make.
- Angular templates live in a separate `.html` file by default; Vue 2 SFCs keep template + script + style in one `.vue` file. If you prefer SFC-style, Angular lets you inline the template with `template: \`...\`` (common for tiny components).

**Where there's no clean parallel at all:**
- Angular's **two-way binding** `[(someProp)]="x"` desugars to `[someProp]="x" (somePropChange)="x = $event"`. Vue 2's `v-model` on components does the exact same desugaring (`:value` + `@input`) — a very direct parallel. React has no equivalent; you always pass both halves manually.
- Angular's `output()` is a true event stream — you can `.emit()` multiple times and each emit fires the handler. Vue 2's `$emit` works the same. React's callback prop also fires on each call; the difference is more aesthetic than functional.

---

## 4. Walkthrough — read the files I wrote

Open these in order:

1. **`ch02-components.ts`** — the parent class.
   - Note the `imports: [UserCard, Panel]` — required to use those tags in the template.
   - `users` is a signal of an array. The `@for` in the template reads it with `users()`.
   - `onGreet(user)` is the handler the child's `(greet)` output triggers.
2. **`ch02-components.html`** — the parent template.
   - `<app-panel title="Team">` passes an `input` (`title`) **and** projects content.
   - Inside the panel, an `@for` loop renders a `<app-user-card>` per user.
   - Each card has two property bindings (`[name]`, `[role]`) and one event binding (`(greet)`).
3. **`user-card/user-card.ts`** — the child.
   - `input.required<string>()` for `name`, optional `input<string>('Unknown')` for `role`.
   - `output<void>()` for the `greet` event — no payload, just "something happened."
4. **`user-card/user-card.html`** — the child template.
   - Reads inputs with `name()` and `role()` — same signal-call syntax as Chapter 01.
   - Both the card and the inner button fire `sayHi()` which emits the output. `$event.stopPropagation()` on the inner button prevents the click from bubbling to the card's handler.
5. **`panel/panel.ts` + `panel.html`** — the content-projection example.
   - Panel is a dumb wrapper. It takes a `title` input and projects whatever the parent put between its tags via `<ng-content />`.

Then open http://localhost:4200/ch02-components and click around.

---

## 5. Exercises

Each exercise lists the theory subsections it uses.

### Exercise 1 — add a third input to `UserCard`

**Theory you need:** *`input()`*.

Add a new input `avatarUrl` of type `string` (optional, no default needed — you can let it be `string | undefined` by writing `input<string>()`). Display it as an `<img>` in the template above the user's name. Pass a URL from the parent (any placeholder image service works, e.g. `'https://i.pravatar.cc/48?u=' + user.id`).

- **What good looks like:** Each card shows a different avatar. If you leave `avatarUrl` off a card, the `<img>` either doesn't render (hint: wrap with `@if`) or shows nothing (acceptable for the exercise).

### Exercise 2 — give `greet` a payload

**Theory you need:** *`output()`*, *`$event`*.

Right now the child emits `output<void>()`. Change it to `output<string>()` and emit `this.name()` — i.e., tell the parent **who** was greeted. In the parent, replace `(greet)="onGreet(user)"` with `(greet)="onGreet($event)"` and change `onGreet` to accept the name string directly.

- **What good looks like:** Clicking a card still updates the status line, but the parent now receives data from the child instead of looking it up itself.
- **Why this matters:** Children shouldn't force parents to know their internals. Emitting the relevant data in the event is better than emitting "something happened" and leaving the parent to re-derive context.

### Exercise 3 — add a header slot to `Panel`

**Theory you need:** *Content projection → multiple slots*.

Currently `Panel` renders its `title` input in the header. Change it so the header is also a projection slot: `<ng-content select="[slot=header]" />`. Keep the default `<ng-content />` for the body. Then in the parent, replace `<app-panel title="Team">` with:

```html
<app-panel>
  <h2 slot="header">Team</h2>
  <!-- body stays here -->
</app-panel>
```

- **What good looks like:** The panel still renders, now with a parent-controlled header. You've swapped a `data` prop for a `markup` prop.
- **Trade-off:** `title` as an input is simpler and type-safe. Projection is more flexible but more verbose. Both are valid; the right choice depends on how much flexibility the parent needs. Flag this trade-off in your head — you'll make this call constantly.

### Exercise 4 — stretch — build an `AddUser` form child

**Theory you need:** *`input()`*, *`output()`*, Chapter 01's *form bindings*.

Create a new child component `app-add-user` in a sibling folder `add-user/`. Give it one input `placeholder` (string, default `'New user name'`) and one output `added` (payload: `string`). It should render a text input + a button; when the button is clicked, emit the current input value and clear the field.

In the parent, listen to `(added)="addUser($event)"` and push a new user onto the `users` signal (hint: `users.update(list => [...list, { id: Date.now(), name: $event, role: 'Guest' }])`).

- **What good looks like:** Type a name, click Add → a new card appears in the panel. Previous cards are untouched.
- **Why this exercise:** It's a mini end-to-end of this chapter — a child with both an input and an output, a parent that updates its own state based on child events, and the UI updates reactively because signals are involved.

---

## 6. Common pitfalls

- **Forgetting `imports: [ChildComponent]` on the parent decorator.** The compiler error reads "'app-user-card' is not a known element." Add the import to the parent's `@Component` decorator — a plain TS import at the top is not enough.
- **Trying to mutate an input from the child.** Inputs are read-only. If the child needs to change the value, it has to emit it back via an output and let the parent decide. (Two-way binding in ch07 is syntactic sugar for exactly this round-trip.)
- **Confusing `(click)` with `(output-name)`.** DOM events are hard-coded by the browser; outputs are declared by the child class. The parent writes `(name)` for both — look at the child's `.ts` to see which outputs it exposes.
- **Over-projecting.** Not every reusable component needs `<ng-content>`. If three props cover the use cases, pass three inputs instead. Projection is for genuine "I don't know what will go in here" slots.
- **Giving outputs noun names like `score`.** By convention, outputs are **verbs or past-tense verbs** — `greet`, `scoreChanged`, `userAdded`. The parent reads them as events: `(scoreChanged)="..."` sounds right; `(score)="..."` doesn't.
- **Emitting objects you'll mutate later.** `.emit(this.users())` is fine (arrays are passed by reference, but the parent treats them as read-only inputs). `.emit(this.workingCopy)` and then mutating `workingCopy` later means the parent sees your mutations. Treat emitted values as immutable snapshots.

---

## Next

Chapter 03 — Binding & signals. We go deeper on `signal`, `computed`, and `effect`, cover all the new control flow (`@if`/`@for`/`@switch`/`@defer`), and build an interactive counter + filter demo. This is the chapter where "thinking in Angular" clicks.
