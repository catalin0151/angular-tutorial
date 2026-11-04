import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';

interface AdminMetrics {
  users: number;
  transactions: number;
  uptime: string;
}

@Component({
  selector: 'app-ch15-admin',
  template: `
    <div class="pane">
      <h3>Admin area</h3>
      <p>
        Gated by <code>roleGuard('admin')</code>. The API call also checks the
        token's role server-side.
      </p>

      <button type="button" (click)="load()">Load /api/admin/metrics</button>

      @if (loading()) { <p class="hint">Loading…</p> }
      @if (error(); as e) { <p class="err">{{ e }}</p> }
      @if (data(); as m) {
        <ul>
          <li>Users: <strong>{{ m.users }}</strong></li>
          <li>Transactions: <strong>{{ m.transactions }}</strong></li>
          <li>Uptime: <strong>{{ m.uptime }}</strong></li>
        </ul>
      }
    </div>
  `,
  styles: [`
    .pane { padding: 1rem 1.25rem; background: #f8fafc; border-radius: 10px; }
    h3 { margin: 0 0 0.5rem; }
    p  { margin: 0 0 0.75rem; color: #475569; }
    code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.9em; }
    button {
      padding: 0.4rem 0.9rem; background: #0f172a; color: #fff;
      border: none; border-radius: 6px; cursor: pointer;
    }
    .hint { color: #64748b; font-size: 0.85rem; margin: 0.75rem 0 0; }
    .err {
      margin: 0.75rem 0 0; padding: 0.5rem 0.75rem;
      background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;
      border-radius: 6px; font-size: 0.9rem;
    }
    ul { margin: 0.75rem 0 0; padding-left: 1.25rem; }
  `],
})
export class Admin {
  private readonly http = inject(HttpClient);

  readonly data = signal<AdminMetrics | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<AdminMetrics>('/api/admin/metrics').subscribe({
      next: m => { this.data.set(m); this.loading.set(false); },
      error: err => { this.error.set(`${err.status}: ${err.statusText}`); this.loading.set(false); },
    });
  }
}
