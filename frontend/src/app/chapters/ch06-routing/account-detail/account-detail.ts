import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'app-ch06-account-detail',
  imports: [RouterLink],
  template: `
    <div class="pane">
      <h2>Account {{ id() }}</h2>
      <p>You landed on this view via a route param.</p>
      <p><a routerLink="../">← back to Accounts</a></p>
    </div>
  `,
  styles: [`
    .pane { padding: 1rem 1.25rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; }
    h2 { margin: 0 0 0.5rem; }
    a { color: #2563eb; }
  `],
})
export class AccountDetail {
  private readonly route = inject(ActivatedRoute);
  readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')), { initialValue: '' });

  isDirty() {
    return true;
  }
}
