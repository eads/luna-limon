import { writable } from 'svelte/store';

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
	const { subscribe, update } = writable<CartItem[]>([]);
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
			update(() => []);
		}
	};
}

export const cart = createCart();
