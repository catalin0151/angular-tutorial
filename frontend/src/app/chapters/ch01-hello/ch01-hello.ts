import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-ch01-hello',
  templateUrl: './ch01-hello.html',
  styleUrl: './ch01-hello.css',
})
export class Ch01Hello {
  readonly name = signal('world');
  readonly greeting = computed(() => `Hello, ${this.name()}!`);

  clear() {
    this.name.set('');
  }
}
