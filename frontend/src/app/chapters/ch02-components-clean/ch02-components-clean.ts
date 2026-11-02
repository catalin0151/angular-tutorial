import { Component, signal } from '@angular/core';
import { UserCard } from './user-card/user-card';
import { Panel } from './panel/panel';

interface User {
  id: number;
  name: string;
  role: string;
}

@Component({
  selector: 'app-ch02-components-clean',
  imports: [UserCard, Panel],
  templateUrl: './ch02-components-clean.html',
  styleUrl: './ch02-components-clean.css',
})
export class Ch02ComponentsClean {
  readonly users = signal<User[]>([
    { id: 1, name: 'Alice',   role: 'Trader' },
    { id: 2, name: 'Bob',     role: 'Analyst' },
    { id: 3, name: 'Carlos',  role: 'Risk' },
  ]);

  readonly lastGreeted = signal<string | null>(null);

  onGreet(user: User) {
    this.lastGreeted.set(user.name);
  }
}
