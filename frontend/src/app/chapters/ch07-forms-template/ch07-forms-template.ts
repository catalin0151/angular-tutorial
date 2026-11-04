import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';

interface Contact {
  name: string;
  email: string;
  role: 'trader' | 'analyst' | 'ops';
  subscribe: boolean;
}

@Component({
  selector: 'app-ch07-forms-template',
  imports: [FormsModule, JsonPipe],
  templateUrl: './ch07-forms-template.html',
  styleUrl: './ch07-forms-template.css',
})
export class Ch07FormsTemplate {
  readonly password = signal<string>('');
  readonly form = signal<Contact>({
    name: '',
    email: '',
    role: 'trader',
    subscribe: false,
  });

  submit() {
    console.log('submitted', this.form());
    alert('Submitted! Check the console.');
  }

  patch<K extends keyof Contact>(key: K, value: Contact[K]) {
    this.form.update(c => ({ ...c, [key]: value }));
  }
}
