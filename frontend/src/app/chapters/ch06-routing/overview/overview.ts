import { Component } from '@angular/core';

@Component({
  selector: 'app-ch06-overview',
  template: `
    <div class="pane">
      <h2>Overview</h2>
      <p>This is the default child route. Click Accounts to see a list, or a specific ID.</p>
    </div>
  `,
  styles: [`
    .pane { padding: 1rem 1.25rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; }
    h2 { margin: 0 0 0.5rem; }
    p { margin: 0; color: #475569; }
  `],
})
export class Overview {}
