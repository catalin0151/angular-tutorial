import { Component, effect, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CartStore } from './cart.store';

interface Product {
  id: number;
  name: string;
  price: number;
}

@Component({
  selector: 'app-ch11-state-signals',
  imports: [CurrencyPipe],
  templateUrl: './ch11-state-signals.html',
  styleUrl: './ch11-state-signals.css',
})
export class Ch11StateSignals {
  readonly cart = inject(CartStore);

  readonly products: Product[] = [
    { id: 1, name: 'License seat',   price:  499.00 },
    { id: 2, name: 'Support pack',   price:  120.00 },
    { id: 3, name: 'Audit module',   price:  899.00 },
    { id: 4, name: 'Training hour',  price:   85.00 },
  ];

  constructor() {
    // Persist to localStorage whenever the cart changes
    effect(() => {
      localStorage.setItem('ch11.cart', JSON.stringify(this.cart.items()));
    });
  }
}
