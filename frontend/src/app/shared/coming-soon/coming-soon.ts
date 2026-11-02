import { Component, input } from '@angular/core';

@Component({
  selector: 'app-coming-soon',
  template: `
    <div class="box">
      <p class="tag">Chapter {{ num() }}</p>
      <h2>{{ title() }}</h2>
      <p class="hint">Not written yet. Finish the earlier chapters first — we fill these in one at a time.</p>
    </div>
  `,
  styles: [`
    .box {
      max-width: 520px;
      margin: 4rem auto;
      padding: 2rem 2.25rem;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      background: #fff;
      text-align: center;
    }
    .tag {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin: 0 0 0.5rem;
    }
    h2 { margin: 0 0 0.75rem; font-size: 1.5rem; color: #0f172a; }
    .hint { color: #475569; margin: 0; }
  `],
})
export class ComingSoon {
  readonly num = input.required<string>();
  readonly title = input.required<string>();
}
