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
                const idx = items.findIndex((i) => i.product.id === product.id);
                if (idx !== -1) {
                    const next = items.slice();
                    const curr = next[idx];
                    next[idx] = { ...curr, quantity: curr.quantity + qty };
                    return next;
                }
                return [...items, { product, quantity: qty }];
            });
        },
        setQuantity(id: string, qty: number) {
            update((items) => {
                const idx = items.findIndex((i) => i.product.id === id);
                if (idx === -1) return items.slice();
                if (qty <= 0) {
                    return items.filter((i) => i.product.id !== id);
                }
                const next = items.slice();
                next[idx] = { ...next[idx], quantity: qty };
                return next;
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
