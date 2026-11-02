import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-user-card',
  templateUrl: './user-card.html',
  styleUrl: './user-card.css',
})
export class UserCard {
  readonly name = input.required<string>();
  readonly role = input<string>('Unknown');

  readonly greet = output<void>();

  sayHi() {
    this.greet.emit();
  }
}
