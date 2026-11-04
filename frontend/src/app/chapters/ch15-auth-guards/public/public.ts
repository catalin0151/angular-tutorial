import { Component } from '@angular/core';

@Component({
  selector: 'app-ch15-public',
  template: `
    <div class="pane">
      <h3>Public</h3>
      <p>Anyone logged in can see this page. No guard beyond <code>authGuard</code>.</p>
    </div>
  `,
  styles: [`
    .pane { padding: 1rem 1.25rem; background: #f8fafc; border-radius: 10px; }
    h3 { margin: 0 0 0.5rem; }
    p  { margin: 0; color: #475569; }
    code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.9em; }
  `],
})
export class Public {}
