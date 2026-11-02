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
- `@HostListener('event')` — listens to a DOM event on the host element. Same effect as writing `(mouseenter)="..."` on the element, but reusable.
- Inputs work the same as on components (`input<T>()`).

**Vue 2 parallel:** this is a Vue 2 **custom directive** (`Vue.directive('highlight', { bind, unbind })`). Same concept, Vue 2 version was less class-like.
**React parallel:** no direct equivalent — you'd use a custom hook attached via a ref, or a wrapper component.

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

### Exercise 4 — stretch — write a `formatBytes` pipe
Convert a number of bytes into `'1.5 KB'`, `'3.2 MB'`, etc. Signature: `transform(value: number, decimals = 1): string`.

---

## 6. Pitfalls

- **Forgot to import the pipe.** Error: *"No pipe found with name 'x'."* Add to `imports: [...]`.
- **Directive selector collisions.** `[highlight]` is too generic — prefix it (`[appHighlight]`, `[dbHighlight]`).
- **Side effects in a pipe.** Pipes are called during change detection — side effects fire at odd times. Keep pipes pure.
- **Writing a custom directive when a plain CSS class would do.** If you only need "add a border on hover," use CSS `:hover`. Directives are for JS behavior.
