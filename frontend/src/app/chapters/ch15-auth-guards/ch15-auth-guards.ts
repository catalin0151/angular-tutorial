import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from './auth.store';

@Component({
  selector: 'app-ch15-auth-guards',
  imports: [ReactiveFormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './ch15-auth-guards.html',
  styleUrl: './ch15-auth-guards.css',
})
export class Ch15AuthGuards {
  readonly auth = inject(AuthStore);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group({
    email: ['alice@db.com', [Validators.required, Validators.email]],
    password: ['alice', Validators.required],
  });

  async submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    await this.auth.login(this.form.controls.email.value, this.form.controls.password.value);
  }

  loginAs(email: string, password: string) {
    this.form.setValue({ email, password });
    this.submit();
  }
}
