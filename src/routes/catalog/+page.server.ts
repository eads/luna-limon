import { listProducts } from '$lib/server/catalog';

export const load = async () => {
	const products = await listProducts();
	return { products };
};
