import { Component, signal } from '@angular/core';
import { UserCard } from './user-card/user-card';
import { Panel } from './panel/panel';
import { AddUser } from './add-user/add-user'
interface User {
  id: number;
  name: string;
  role: string;
}

@Component({
  selector: 'app-ch02-components',
  imports: [UserCard, Panel, AddUser],
  templateUrl: './ch02-components.html',
  styleUrl: './ch02-components.css',
})
export class Ch02Components {
  readonly users = signal<User[]>([
    { id: 1, name: 'Alice', role: 'Trader' },
    { id: 2, name: 'Bob', role: 'Analyst' },
    { id: 3, name: 'Carlos', role: 'Risk' },
  ]);

  readonly lastGreeted = signal<string | null>(null);

  onGreet(userName: string) {
    this.lastGreeted.set(userName);
  }
  onAddNewUser(userName: string) {
    let newUser: User = {
      id: Math.random(),
      name: userName,
      role: 'Trader'
    }

    this.users.update(users => [...users, newUser]);
  }
}
