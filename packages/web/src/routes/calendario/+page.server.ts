import type { PageServerLoad } from './$types';
import { listProducts } from '$lib/server/catalog';
// @ts-expect-error runtime import
import { getLocale } from '$lib/paraglide/runtime.js';

export const load: PageServerLoad = async () => {
  const locale: 'es' | 'en' = getLocale();
  const products = await listProducts(locale, { tipo: 'calendario' });
  return { products };
};

