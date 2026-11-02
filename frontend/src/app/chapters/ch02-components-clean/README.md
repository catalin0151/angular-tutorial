# Chapter 02 (clean) — Components & templates

> **Pristine starter copy.** Identical to Chapter 02's starting state. Use this folder to redo the exercises without touching your original work. Everything here uses the suffix `-clean` so routes and class names don't collide (route: `/ch02-components-clean`, class: `Ch02ComponentsClean`).

**Goal:** Learn how two components talk to each other. Three concepts: `input()` for parent → child, `output()` for child → parent, `<ng-content>` for projecting content from parent into a slot in the child.

---

## 1. Theory

### `input()` — receiving data from the parent

Child class:
```ts
@Component({ /* ... */ })
export class UserCard {
  readonly name = input.required<string>();          // must be set
  readonly role = input<string>('Unknown');          // optional, with default
}
```

Parent template:
```html
<app-user-card [name]="user.name" [role]="user.role" />
```

- `input.required<T>()` — parent **must** pass this prop (compile error otherwise).
- `input<T>(defaultValue)` — optional with default.
- Read inside the child with `name()` (it's a signal).
- Legacy `@Input() name = ''` still works — new code should use `input()`.

### `output()` — notifying the parent

Child class:
```ts
export class UserCard {
  readonly greet = output<void>();                   // no payload
  readonly scoreChanged = output<number>();          // with payload

  sayHi() { this.greet.emit(); }
  updateScore(n: number) { this.scoreChanged.emit(n); }
}
```

Parent template:
```html
<app-user-card
  (greet)="onGreet(user)"
  (scoreChanged)="handleScore($event)"
/>
```

- `output<T>()` creates an event stream.
- `$event` inside the handler is whatever the child passed to `.emit()`.
- Legacy `@Output() greet = new EventEmitter<void>()` still works.

**React parallel:** callback prop pattern (`<Child onGreet={handler} />`).
**Vue 2 parallel:** `this.$emit('greet')` from the child + `<child @greet="handler" />` in parent — Angular's model is nearly identical.

### Content projection — `<ng-content>`

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

**Multiple slots:**
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

**React parallel:** `{props.children}`. **Vue 2 parallel:** `<slot/>` + named slots — nearly identical to Angular's `<ng-content>` model.

### Wiring: how the parent "imports" a child

```ts
@Component({
  selector: 'app-ch02-components-clean',
  imports: [UserCard, Panel],              // ← both children listed
  templateUrl: './ch02-components-clean.html',
  styleUrl: './ch02-components-clean.css',
})
export class Ch02ComponentsClean { /* ... */ }
```

Forget this → compile error: *"'app-user-card' is not a known element."*

**Vue 2 parallel:** `components: { UserCard, Panel }` option — same job, same reason (template compiler needs to know which tags are legal).

### `$event` sources

- DOM event binding → `$event` is the browser's event object.
- Component output binding → `$event` is whatever the child emitted.

### `@if ... ; as who`

```html
@if (lastGreeted(); as who) {
  <p>Last greeted: {{ who }}</p>
}
```

Captures the truthy value of the condition into a local called `who` inside the block. Useful for narrowing `string | null` → `string`.

---

## 2. Why files are named/structured this way

Children nested under the parent:
```
ch02-components-clean/
├── ch02-components-clean.ts/.html/.css
├── user-card/
│   └── user-card.ts/.html/.css
└── panel/
    └── panel.ts/.html/.css
```

Rule: colocate children with their parent until there's a second consumer, then promote to `shared/`.

---

## 3. Angular / Vue 2 / React parallel

| Angular | Vue 2 | React |
|---|---|---|
| `input.required<string>()` | `props: { name: { type: String, required: true } }` | TS prop `name: string` |
| `input<string>('x')` | `props: { role: { type: String, default: 'x' } }` | default prop |
| `[name]="user.name"` | `:name="user.name"` | `name={user.name}` |
| `output<T>()` + `.emit(x)` | `this.$emit('eventName', x)` | callback prop |
| `(greet)="handler($event)"` | `@greet="handler($event)"` | `onGreet={handler}` |
| `<ng-content/>` | `<slot/>` | `{props.children}` |
| `<ng-content select="[slot=x]"/>` | `<slot name="x"/>` | multiple children props |
| `imports: [UserCard]` | `components: { UserCard }` | `import` at top |

---

## 4. Walkthrough

Open and read:
1. `ch02-components-clean.ts` — parent with `users` signal and `onGreet` handler. Imports `UserCard` and `Panel`.
2. `ch02-components-clean.html` — parent template with `<app-panel>` projecting `<app-user-card>` cards inside.
3. `user-card/user-card.ts` — child with `input()` for name/role and `output()` for greet.
4. `user-card/user-card.html` — reads inputs, emits output on click.
5. `panel/panel.ts/.html` — content projection example.

Then open http://localhost:4200/ch02-components-clean.

---

## 5. Exercises

### Exercise 1 — add a third input to `UserCard`

Add `avatarUrl` of type `string` (optional, use `input<string>()`). Display it as an `<img>` above the user's name. Pass from parent, e.g. `[avatarUrl]="'https://i.pravatar.cc/48?u=' + user.id"`.

- Wrap the `<img>` with `@if (avatarUrl()) { ... }` so it only renders when there's a URL.

### Exercise 2 — give `greet` a payload

Change `output<void>()` to `output<string>()` and emit `this.name()`. In parent, change `(greet)="onGreet(user)"` to `(greet)="onGreet($event)"` and update `onGreet` to accept a string.

### Exercise 3 — add a header slot to `Panel`

Rewrite `panel.html` so the header is projected via `<ng-content select="[slot=header]" />`. In the parent, swap `<app-panel title="Team">` for:
```html
<app-panel>
  <h2 slot="header">Team</h2>
  <!-- body stays here -->
</app-panel>
```

Also remove the now-unused `title` input from `Panel`.

### Exercise 4 — stretch — `AddUser` form child

Create `add-user/add-user.ts/.html` with:
- Input `placeholder` (string, default `'New user name'`).
- Output `added` (payload: `string`).
- Text input + button; emit the current input value on click and clear the field.

In the parent: `(added)="addUser($event)"` and `addUser(name)` pushes a new user onto the `users` signal.

Hint for the parent handler:
```ts
addUser(name: string) {
  this.users.update(list => [...list, { id: Date.now(), name, role: 'Guest' }]);
}
```

---

## 6. Pitfalls

- **Forgetting `imports: [ChildComponent]`.** Error: *"'app-x' is not a known element."*
- **Trying to mutate an input from the child.** Inputs are read-only. Emit back via output and let the parent decide.
- **Confusing `(click)` with `(output-name)`.** DOM events are hard-coded; outputs are declared by the child.
- **Over-projecting.** Not every reusable component needs `<ng-content>`. If three props cover it, use three inputs.
- **Giving outputs noun names.** By convention, outputs are **verbs or past-tense verbs** — `greet`, `scoreChanged`, `userAdded`.
- **Emitting references you'll mutate.** Treat emitted values as immutable snapshots.
