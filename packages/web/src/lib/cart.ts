import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Product = {
  id: string;
  nombre: { es?: string; en?: string };
  descripción: { es?: string; en?: string };
  precio: number;
  imagen?: string;
};

export interface CartItem {
	product: Product;
	quantity: number;
}

function createCart() {
    const load = (): CartItem[] => {
        if (!browser) return [];
        try {
            const raw = localStorage.getItem('cart');
            return raw ? (JSON.parse(raw) as CartItem[]) : [];
        } catch {
            return [];
        }
    };

    const store: Writable<CartItem[]> = writable<CartItem[]>(load());
    if (browser) {
        store.subscribe((items) => {
            try {
                localStorage.setItem('cart', JSON.stringify(items));
            } catch {}
        });
    }

    const { subscribe, update, set } = store;
    return {
        subscribe,
        add(product: Product, qty = 1) {
            update((items) => {
                const existing = items.find((i) => i.product.id === product.id);
                if (existing) {
                    existing.quantity += qty;
                } else {
                    items.push({ product, quantity: qty });
                }
                return items;
            });
        },
        remove(id: string) {
            update((items) => items.filter((i) => i.product.id !== id));
        },
        clear() {
            set([]);
        }
    };
}

export const cart = createCart();
