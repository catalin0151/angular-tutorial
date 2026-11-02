import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-ch01-hello-clean',
  templateUrl: './ch01-hello-clean.html',
  styleUrl: './ch01-hello-clean.css',
})
export class Ch01HelloClean {
  readonly name = signal('world');
  readonly greeting = computed(() => `Hello, ${this.name()}!`);

  clear() {
    this.name.set('');
  }
}
