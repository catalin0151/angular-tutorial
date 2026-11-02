import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ch06-accounts',
  imports: [RouterLink],
  template: `
    <div class="pane">
      <h2>Accounts</h2>
      <ul>
        @for (id of ids; track id) {
          <li><a [routerLink]="['../accounts', id]">{{ id }}</a></li>
        }
      </ul>
    </div>
  `,
  styles: [`
    .pane { padding: 1rem 1.25rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; }
    h2 { margin: 0 0 0.5rem; }
    ul { margin: 0; padding-left: 1.25rem; }
    a { color: #2563eb; }
  `],
})
export class Accounts {
  readonly ids = ['ACC-001', 'ACC-002', 'ACC-003', 'ACC-042'];
}
