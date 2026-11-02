import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'db-ch01-hello',
  templateUrl: './ch01-hello.html',
  styleUrl: './ch01-hello.css',
})
export class Ch01Hello {
  readonly name = signal('world');
  readonly greetingStyle = signal('casual');
  readonly greeting = computed(() => {

    switch (this.greetingStyle()) {
      case 'casual':
        return `Hello, ${this.name()}!`
      case 'formal':
        return `Good Day, ${this.name()}`
      default:
        return 'Invalid message'
    }
  });
  readonly nameCharNumber = computed(() => {
    return this.name().length;
  })
  clear() {
    this.name.set('');
  }
  reset() {
    this.name.set('world');
  }
}
