# Chapter 04 — Directives & pipes

**Goal:** Learn to format values with pipes, write a custom pipe, write a custom directive, and master the daily `[class.x]` / `[style.prop.unit]` shorthands.

---

## 1. Theory

### Pipes — format values in templates

A pipe transforms a value for display. Syntax: `value | pipeName:arg1:arg2`.

```html
{{ 1234.5 | number:'1.2-2' }}       <!-- 1,234.50 -->
{{ 19.99 | currency:'USD' }}        <!-- $19.99 -->
{{ 0.0825 | percent:'1.0-2' }}      <!-- 8.25% -->
{{ now | date:'yyyy-MM-dd' }}       <!-- 2026-11-02 -->
{{ 'hello' | titlecase }}           <!-- Hello -->
{{ list | json }}                   <!-- debug: pretty JSON -->
{{ longText | slice:0:20 }}         <!-- first 20 chars -->
```

**Rules:**
- Pipes are pure functions. Angular caches results per input — a pipe with the same args and value doesn't re-run.
- You chain them: `{{ price | currency:'EUR' | uppercase }}`.
- Standalone components **must import** them from `@angular/common`.
- Precedence is low — wrap in parens if combining with ternaries: `{{ (price > 0 ? price : 0) | currency }}`.

**Vue 2 parallel:** this is `{{ value | filter }}` filters from Vue 2 (removed in Vue 3). Same syntax, same concept.
**React parallel:** no built-in equivalent — you'd call `formatCurrency(price)` in JSX.

### Custom pipes

```ts
@Pipe({ name: 'truncate' })
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, limit = 20, suffix = '…'): string {
    if (!value) return '';
    return value.length > limit ? value.slice(0, limit) + suffix : value;
  }
}
```

Then use it: `{{ longText | truncate:30:' […]' }}`.

- **File name:** `truncate.pipe.ts` (old convention) or `truncate.ts` (new v20 convention). I'm keeping `.pipe.ts` here because the suffix is especially useful for pipes — they're one-liners and a file called `truncate.ts` next to `highlight.directive.ts` is confusing.
- Register it in the parent component's `imports: [TruncatePipe]`.
- Keep pipes pure. Side effects in a pipe will fire at unpredictable times.

### Directives — behavior that attaches to any element

A directive is a class with a selector, just like a component, but **without a template of its own**. It modifies the element it's attached to.

```ts
@Directive({ selector: '[appHighlight]' })
export class Highlight {
  readonly appHighlight = input<string>('#fef08a');
  private readonly el = inject(ElementRef<HTMLElement>);

  @HostListener('mouseenter') onEnter() { this.el.nativeElement.style.backgroundColor = this.appHighlight(); }
  @HostListener('mouseleave') onLeave() { this.el.nativeElement.style.backgroundColor = ''; }
}
```

Usage:

```html
<p appHighlight>Default yellow</p>
<p [appHighlight]="'#bfdbfe'">Custom blue</p>
```

**Key pieces:**
- `selector: '[appHighlight]'` — attribute selector. Any element with `appHighlight` on it gets this behavior.
- `inject(ElementRef)` — Angular hands you a reference to the host DOM element.
- `@HostListener('event')` — listens to a DOM event on the host element. (See the dedicated section below — it does a lot.)
- Inputs work the same as on components (`input<T>()`).

**Vue 2 parallel:** this is a Vue 2 **custom directive** (`Vue.directive('highlight', { bind, unbind })`). Same concept, Vue 2 version was less class-like.
**React parallel:** no direct equivalent — you'd use a custom hook attached via a ref, or a wrapper component.

### `@HostListener` — the whole picture

`@HostListener` is how a directive (or component) subscribes to DOM events on its host element. It's declarative — no `addEventListener`/`removeEventListener`, no manual cleanup. Angular wires it up at attach time and removes it when the directive is destroyed.

#### Target forms

The string argument tells Angular **where** to listen:

```ts
@HostListener('click')                        // the host element itself
@HostListener('mouseenter')                   // host
@HostListener('document:click')               // document-level
@HostListener('document:keydown.escape')      // document with key filter
@HostListener('window:resize')                // window-level
@HostListener('window:scroll')                // window-level
```

- **No prefix** → the host DOM node.
- **`document:`** → `document.addEventListener(...)`. Use for global shortcuts, outside-click detection, modal dismissal.
- **`window:`** → `window.addEventListener(...)`. Use for resize, scroll, visibility change.

Angular auto-cleans up all three when the directive/component is destroyed. No `ngOnDestroy` needed.

#### Receiving the event (second argument)

By default the method receives no arguments. To get the event, pass a `['$event']` array:

```ts
@HostListener('click', ['$event']) onClick(e: MouseEvent) {
  e.stopPropagation();
  e.preventDefault();
}

// Pass just one field
@HostListener('keydown', ['$event.key']) onKey(key: string) {
  if (key === 'Enter') this.save();
}

// Pass the event target (nullable — strict TS requires the guard)
@HostListener('document:click', ['$event.target']) onDocClick(target: EventTarget | null) {
  if (target && !this.el.nativeElement.contains(target as Node)) {
    this.outside.emit();
  }
}

// Pass multiple pieces
@HostListener('mousemove', ['$event.clientX', '$event.clientY']) onMove(x: number, y: number) {
  this.pos.set({ x, y });
}
```

Rule of thumb: pass **the smallest thing you actually need**. Passing `$event.target` instead of `$event` makes the method signature honest about what it uses, and makes testing easier (just hand it a target, not a whole event).

#### Keyboard filters — Angular's "pseudo-events"

Angular has first-class syntax for keyboard shortcuts, built into `@HostListener`:

```ts
@HostListener('keydown.escape')              // Esc
@HostListener('keydown.enter')               // Enter
@HostListener('keydown.space')               // Space (also 'keydown.spacebar')
@HostListener('keydown.arrowup')             // ↑
@HostListener('keydown.arrowdown')           // ↓
@HostListener('keydown.control.s')           // Ctrl+S
@HostListener('keydown.control.shift.p')     // Ctrl+Shift+P
@HostListener('keydown.meta.k')              // Cmd+K on Mac / Win+K on Windows
@HostListener('document:keydown.escape')     // document-wide
```

The parser understands modifiers (`control`, `shift`, `alt`, `meta`) in any order and the key name at the end. **This saves you from writing `if (e.ctrlKey && e.key === 's') ...` manually.**

Modifier aliases:
- `control` = Ctrl
- `meta` = Cmd on Mac, Win on Windows
- `alt` = Alt / Option
- `shift` = Shift

For save-shortcut-style bindings, also call `preventDefault()` so the browser doesn't do its default (e.g., "Save page as…"):

```ts
@HostListener('document:keydown.control.s', ['$event'])
onSave(e: KeyboardEvent) {
  e.preventDefault();
  this.save();
}
```

#### Common recipes

**Close on Escape (modal / dropdown):**
```ts
@HostListener('document:keydown.escape') onEscape() {
  this.close.emit();
}
```

**Click outside to dismiss:**
```ts
@HostListener('document:click', ['$event.target']) onDocClick(target: EventTarget | null) {
  if (target && !this.el.nativeElement.contains(target as Node)) {
    this.dismiss.emit();
  }
}
```

**Throttled window resize:**
```ts
private resizeTimer: ReturnType<typeof setTimeout> | null = null;

@HostListener('window:resize') onResize() {
  if (this.resizeTimer) clearTimeout(this.resizeTimer);
  this.resizeTimer = setTimeout(() => this.recompute(), 150);
}
```

**Confirm before leaving:**
```ts
@HostListener('window:beforeunload', ['$event']) onLeave(e: BeforeUnloadEvent) {
  if (this.hasUnsavedChanges()) {
    e.preventDefault();
    e.returnValue = '';  // browsers show a native prompt
  }
}
```

**Drag detection — three events on different targets:**
```ts
@HostListener('mousedown', ['$event']) onDown(e: MouseEvent) {
  this.dragging = true;
  this.start = { x: e.clientX, y: e.clientY };
}

@HostListener('document:mousemove', ['$event']) onMove(e: MouseEvent) {
  if (!this.dragging) return;
  this.offset.set({ x: e.clientX - this.start.x, y: e.clientY - this.start.y });
}

@HostListener('document:mouseup') onUp() {
  this.dragging = false;
}
```

Note the asymmetry: `mousedown` listens on the host (user has to grab it), but `mousemove` and `mouseup` listen on `document:` (the mouse might leave the host during drag — the native pattern).

#### `@HostListener` vs. inline `(event)`

For a component's **own** template, inline `(click)="..."` on inner elements is more readable:

```html
<!-- in some-widget.html -->
<button (click)="save()">Save</button>
```

Reach for `@HostListener` when:
1. **You want to listen on the host element itself** — not something inside. E.g., `<app-modal>` capturing `document:keydown.escape` to close itself.
2. **You want global events** (`document:`, `window:`).
3. **You're writing a directive** — directives have no template, so inline bindings aren't an option.

#### Modern `host` object alternative

The new Angular style guide prefers putting listeners in the `host` property instead of decorators:

```ts
@Directive({
  selector: '[appHighlight]',
  host: {
    '(mouseenter)': 'onEnter()',
    '(mouseleave)': 'onLeave()',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class Highlight {
  onEnter()  { /* ... */ }
  onLeave()  { /* ... */ }
  onEscape() { /* ... */ }
}
```

Same behavior, slightly cleaner. **For this tutorial we use `@HostListener`** because it's more familiar if you've read older Angular material — but new code often uses the `host` object. Both are fine.

#### Pitfalls

- **Fires on every event — no debouncing.** `mousemove`, `scroll`, `resize` fire many times per second. Either throttle inside the handler or avoid listening at all.
- **`document:`/`window:` listeners fire for every component instance.** If you have 100 of a directive on screen, 100 handlers run on every `document:click`. Prefer one top-level listener in a service when possible.
- **`$event` has type `Event` by default.** Narrow it: `(e: MouseEvent)`, `(e: KeyboardEvent)`.
- **Can't filter by `$event.key` as a target string.** Only `keydown.<key>` / `keyup.<key>` work that way; for arbitrary conditions, filter inside the handler.
- **`beforeunload` requires `preventDefault()` + `returnValue`** to show a prompt. Not all browsers obey custom text.

### Template refs: using DOM nodes and child instances from the class

Chapter 01 showed template reference variables (`#nameEl`) used **inside the template**. To use the same reference from the **class** (what React's `useRef` does), use `viewChild()`.

#### Grabbing a DOM element

Template:
```html
<input #nameInput type="text" />
<button (click)="focusInput()">Focus</button>
```

Class:
```ts
import { Component, viewChild, ElementRef } from '@angular/core';

export class Example {
  readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  focusInput() {
    this.nameInput()?.nativeElement.focus();
  }
}
```

- `viewChild('nameInput')` returns a **signal**.
- Call it with `()`; returns `undefined` until the view has rendered.
- `ElementRef<HTMLInputElement>` gives you typed `.nativeElement`.
- Use `viewChild.required(...)` if the element is unconditionally present — no `?.` needed.

#### Grabbing a child component instance

```ts
import { viewChild, viewChildren } from '@angular/core';
import { UserCard } from './user-card/user-card';

readonly firstCard = viewChild(UserCard);           // first match, Signal<UserCard | undefined>
readonly allCards  = viewChildren(UserCard);        // Signal<readonly UserCard[]>

greetAll() {
  for (const c of this.allCards()) c.sayHi();
}
```

#### `viewChild` vs. `inject(ElementRef)`

- `viewChild('x')` — reach for an element **inside your template** by its `#x` label.
- `inject(ElementRef)` — reach for **your own host element** (the one the directive/component is attached to).

#### When to reach for refs

Rarely. Prefer `input()` + `output()` (Chapter 02) for parent-child communication. Reach for `viewChild` only when:
- An imperative API has no reactive equivalent (`element.focus()`, `video.play()`, `canvas.getContext()`).
- A third-party library needs a specific DOM node.
- You need to measure (`getBoundingClientRect`, `scrollTop`).

#### Legacy `@ViewChild` decorator

```ts
@ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;

ngAfterViewInit() {
  this.nameInput.nativeElement.focus();   // only valid after this lifecycle hook
}
```

Non-signal, populated after `ngAfterViewInit`. New code uses `viewChild()`. Legacy codebases still use the decorator — you'll read it on the job.

#### React / Vue 2 parallel

| Angular | Vue 2 | React |
|---|---|---|
| `#nameInput` + `viewChild('nameInput')` | `ref="nameInput"` + `this.$refs.nameInput` | `const r = useRef(null)` + `<input ref={r}/>` + `r.current` |
| `viewChild(ChildComponent)` | `ref="child"` + `this.$refs.child.method()` | `ref={childRef}` + `childRef.current.method()` |
| `inject(ElementRef)` | n/a | n/a (functional components) |

---

### Structural vs. attribute vs. component — the three directive flavors

- **Component** = directive with a template. (Chapters 01–03.)
- **Attribute directive** = modifies the element it attaches to (`appHighlight`, `[class.x]`, `[style.prop]`).
- **Structural directive** = adds/removes elements from the DOM (`*ngIf`, `*ngFor`). The `*` is Angular syntax sugar — these have been **largely replaced by `@if`/`@for`** in modern code. You can write your own structural directive if needed, but you probably never will.

### `[class.foo]` and `[style.prop.unit]` — the binding shorthands

These look like property bindings but are really Angular shortcuts for toggling classes and styles. You've seen them already:

```html
<!-- toggle a single class -->
<div [class.active]="isActive()">...</div>

<!-- toggle multiple classes from an object -->
<div [class]="{ active: isActive(), disabled: !canSave() }">...</div>

<!-- set a single style with a unit suffix -->
<div [style.font-size.px]="fontSize()">...</div>
<div [style.width.%]="progress()">...</div>

<!-- set multiple styles from an object -->
<div [style]="{ color: 'red', 'font-weight': 'bold' }">...</div>
```

**The `.px` / `.%` / `.em` suffix** means "the value is a number, append this unit." Without it, you'd have to write `fontSize() + 'px'` in the template, which is ugly.

**Vue 2 parallel:** `:class="{ active: isActive }"` and `:style="{ color: 'red' }"` — nearly identical. Vue 2 doesn't have the unit-suffix trick.

---

## 2. Why files are named/structured this way

Directives and pipes get their own suffixed files in older codebases: `highlight.directive.ts`, `truncate.pipe.ts`. In the v20 convention these would just be `highlight.ts` and `truncate.ts` — but for pipes/directives I still recommend keeping the suffix because the file is often a few lines and the suffix is useful context when you're reading imports.

**Team call** — be consistent within a project. If the team dropped suffixes everywhere, drop them. If kept them, keep them.

---

## 3. Angular / Vue 2 / React parallel

| Angular | Vue 2 | React |
|---|---|---|
| `{{ x | currency }}` | `{{ x | currency }}` (removed in V3) | `formatCurrency(x)` util |
| Custom `@Pipe()` | Vue 2 custom filter | plain util function |
| `@Directive([appX])` + `@HostListener` | `Vue.directive('x', { bind, unbind })` | custom hook + ref |
| `[class.active]="x()"` | `:class="{ active: x }"` | `className={clsx({active: x})}` |
| `[style.width.px]="n()"` | `:style="{ width: n + 'px' }"` | `style={{ width: `${n}px` }}` |

---

## 4. Walkthrough

Open the four files and run the chapter:

- `ch04-directives-pipes.ts` — imports every pipe + the directive + custom pipe. Hands state to the template.
- `ch04-directives-pipes.html` — demonstrates built-in pipes, custom pipe, directive, and class/style bindings.
- `truncate.pipe.ts` — a one-method class marked with `@Pipe`.
- `highlight.directive.ts` — hover handler via `@HostListener`.

Open http://localhost:4200/ch04-directives-pipes.

---

## 5. Exercises

### Exercise 1 — build a `yesNo` pipe
Transform a boolean into `'Yes'` / `'No'`. Use it on `isActive()`.

### Exercise 2 — extend `Highlight` to accept a hover color AND an "always on" mode
Add a second input `always = input(false)`. When `true`, apply the color on mount and never remove it.

### Exercise 3 — class binding from a computed
Add a signal `score = signal(50)`. Compute a class name (`'low' | 'mid' | 'high'`) with a `computed`. Bind it with `[class]="scoreClass()"`.

### Exercise 4 — stretch — write a `clickOutside` directive

**Theory you need:** *Directives*, *`@HostListener` with `document:` prefix*, *`output()`*.

Write an attribute directive `[appClickOutside]` that emits an event whenever the user clicks **outside** the host element. Classic use case: closing dropdowns, modals, popovers.

**File:** `click-outside.directive.ts` next to the other directive. Starter:

```ts
import { Directive, ElementRef, HostListener, inject, output } from '@angular/core';

@Directive({ selector: '[appClickOutside]' })
export class ClickOutside {
  readonly appClickOutside = output<void>();
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostListener('document:click', ['$event.target'])
  onDocClick(target: Node) {
    // if target is NOT inside this.el.nativeElement, emit
  }
}
```

Hint: use `this.el.nativeElement.contains(target)` to check whether the click was inside the host.

**Usage in the chapter template:**

```html
<div
  class="box active"
  appClickOutside
  (appClickOutside)="toggle()"
>
  Click outside me to toggle the box's active class.
</div>
```

- **What good looks like:** clicking inside the box doesn't fire; clicking anywhere outside fires `(appClickOutside)` → the `toggle()` method flips `isActive()`. Watch the "active"/"inactive" state update in real time without any extra wiring.
- **Why this exercise fits the chapter:** it exercises **three things from this chapter at once** — a custom directive, `@HostListener` on `document:`, and `output()` with a parent event binding. It's also a directive you'll actually ship — dropdowns, menus, modals all need it.
- **Bonus:** make it configurable. Add an `active = input(true)` so a consumer can opt out by passing `[appClickOutside]="false"` or similar. (Design the API however feels right — this is where the Pattern 1 / 2 / 3 multi-input choices from the chapter show up.)

### Exercise 5 — focus an input with `viewChild` (React `useRef` equivalent)

**Theory you need:** *Template refs: using DOM nodes and child instances from the class → Grabbing a DOM element*.

Build this on the chapter page:

1. Add a `<input #searchInput type="text" placeholder="search" />` and a `<button>Focus the input</button>` to `ch04-directives-pipes.html`.
2. In `ch04-directives-pipes.ts`, grab the input with `viewChild` and expose a method that focuses it.

**Starter — `ch04-directives-pipes.ts`:**
```ts
import { Component, viewChild, ElementRef, signal } from '@angular/core';

export class Ch04DirectivesPipes {
  // ...existing fields...
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  focusSearch() {
    this.searchInput()?.nativeElement.focus();
  }
}
```

**Starter — `ch04-directives-pipes.html`:**
```html
<div class="card">
  <h2>Template ref — focus the input from the class</h2>
  <input #searchInput type="text" placeholder="search" />
  <button type="button" (click)="focusSearch()">Focus the input</button>
</div>
```

- **What good looks like:** clicking the button focuses the input (you'll see the blur ring + cursor).
- **Why `?.`:** `viewChild()` returns `undefined` until the view has rendered. Optional chaining skips the call safely during the brief window before mount.
- **Try also:** switch to `viewChild.required(...)` and remove the `?.` — same behavior for this case (the input is unconditionally in the template), but Angular throws at init if the ref ever goes missing.
- **Bonus:** add `clearSearch()` that reads `searchInput()?.nativeElement.value`, clears the input via `.value = ''`, and re-focuses. This is "controlled from the class without a signal" — rarely the right pattern (prefer a signal + `[value]` binding), but worth doing once so you know it works and feel why signals are cleaner.

---

## 6. Pitfalls

- **Forgot to import the pipe.** Error: *"No pipe found with name 'x'."* Add to `imports: [...]`.
- **Directive selector collisions.** `[highlight]` is too generic — prefix it (`[appHighlight]`, `[dbHighlight]`).
- **Side effects in a pipe.** Pipes are called during change detection — side effects fire at odd times. Keep pipes pure.
- **Writing a custom directive when a plain CSS class would do.** If you only need "add a border on hover," use CSS `:hover`. Directives are for JS behavior.
