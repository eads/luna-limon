import { listProducts } from '$lib/server/catalog';
// @ts-expect-error - runtime types not generated yet
import { getLocale } from '$lib/paraglide/runtime.js';

export const load = async () => {
	const products = await listProducts(getLocale());
	return { products };
};
