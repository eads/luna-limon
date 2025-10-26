import type { PageServerLoad } from './$types';
import { listProducts } from '$lib/server/catalog';
import { getLocale } from '$lib/paraglide/runtime.js';

export const load: PageServerLoad = async () => {
  const locale: 'es' | 'en' = getLocale();
  const products = await listProducts(locale, { tipo: 'desayuno' });
  return { products };
};
