import { writable } from 'svelte/store';
import type { Product } from './server/catalog';

export interface CartItem {
	product: Product;
	quantity: number;
}

function createCart() {
	const { subscribe, update } = writable<CartItem[]>([]);
	return {
		subscribe,
		add(product: Product) {
			update((items) => {
				const existing = items.find((i) => i.product.id === product.id);
				if (existing) {
					existing.quantity += 1;
				} else {
					items.push({ product, quantity: 1 });
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
