import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-user-card',
  templateUrl: './user-card.html',
  styleUrl: './user-card.css',
})
export class UserCard {
  readonly name = input.required<string>();
  readonly role = input<string>('Unknown');
  readonly avatarUrl = input<string>()
  readonly greet = output<string>();

  sayHi() {
    this.greet.emit(this.name());
  }
}
