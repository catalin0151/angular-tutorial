import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface User {
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface LoginResponse {
  token: string;
  user: User;
}

const STORAGE_KEY = 'ch15.auth';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly http = inject(HttpClient);

  private readonly _token = signal<string | null>(this.loadToken());
  private readonly _user  = signal<User | null>(this.loadUser());
  private readonly _loading = signal(false);
  private readonly _error   = signal<string | null>(null);

  readonly token = this._token.asReadonly();
  readonly user  = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error   = this._error.asReadonly();

  readonly isLoggedIn = computed(() => this._token() !== null);
  readonly role       = computed(() => this._user()?.role ?? null);

  async login(email: string, password: string) {
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await firstValueFrom(
        this.http.post<LoginResponse>('/api/auth/login', { email, password })
      );
      this._token.set(res.token);
      this._user.set(res.user);
      this.persist();
    } catch (e: any) {
      this._error.set(e?.error?.message ?? 'Login failed');
    } finally {
      this._loading.set(false);
    }
  }

  logout() {
    this._token.set(null);
    this._user.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  hasRole(role: User['role']): boolean {
    return this._user()?.role === role;
  }

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: this._token(), user: this._user() }));
  }

  private loadToken(): string | null {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')?.token ?? null; }
    catch { return null; }
  }

  private loadUser(): User | null {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')?.user ?? null; }
    catch { return null; }
  }
}
