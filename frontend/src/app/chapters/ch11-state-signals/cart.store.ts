import { Injectable, computed, signal } from '@angular/core';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<CartItem[]>([]);

  readonly items   = this._items.asReadonly();
  readonly count   = computed(() => this._items().reduce((n, i) => n + i.qty, 0));
  readonly total   = computed(() => this._items().reduce((n, i) => n + i.qty * i.price, 0));
  readonly isEmpty = computed(() => this._items().length === 0);

  add(item: Omit<CartItem, 'qty'>) {
    this._items.update(list => {
      const existing = list.find(i => i.id === item.id);
      if (existing) {
        return list.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...list, { ...item, qty: 1 }];
    });
  }

  increment(id: number) {
    this._items.update(list => list.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i));
  }

  decrement(id: number) {
    this._items.update(list =>
      list.flatMap(i => {
        if (i.id !== id) return i;
        return i.qty > 1 ? { ...i, qty: i.qty - 1 } : [];
      })
    );
  }

  remove(id: number) {
    this._items.update(list => list.filter(i => i.id !== id));
  }

  clear() {
    this._items.set([]);
  }
}
