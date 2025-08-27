import type { LayoutServerLoad } from './$types';
import { base } from '$lib/server/airtable';
import { AIRTABLE_PRODUCTS_TABLE } from '$env/static/private';
// @ts-expect-error - runtime types not generated yet
import { getLocale } from '$lib/paraglide/runtime.js';

const COPY_TABLE = process.env.AIRTABLE_COPY_TABLE || process.env.AIRTABLE_TABLE || 'texto';

export const load: LayoutServerLoad = async ({ setHeaders }) => {
  const locale: 'en' | 'es' = getLocale();

  // Cache the HTML at the edge; allow SWR for 60s
  setHeaders({ 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=60' });

  // messages from texto table
  const textoRecords = await base(COPY_TABLE).select().all();
  const messages: Record<string, { text: string }> = {};
  for (const r of textoRecords) {
    const key = (r.get('clave') as string) || (r.get('key') as string);
    if (!key) continue;
    const raw = (r.get(`texto_${locale}`) as string) || (r.get(locale) as string);
    if (!raw) continue;
    messages[key] = { text: raw };
  }

  // products (bilingual fields)
  const productRecords = await base(AIRTABLE_PRODUCTS_TABLE).select().all();
  const products = productRecords.map((r) => {
    const raw = r.get('imagen') as unknown;
    let imagen: string | undefined;
    if (Array.isArray(raw) && raw.length) {
      const first = raw[0] as { url?: string } | string;
      imagen = typeof first === 'string' ? first : first.url;
    } else if (typeof raw === 'string') {
      imagen = raw;
    }
    return {
      id: r.id,
      nombre: {
        es: (r.get('nombre_es') as string) || '',
        en: (r.get('nombre_en') as string) || ''
      },
      descripción: {
        es: (r.get('descripción_es') as string) || '',
        en: (r.get('descripción_en') as string) || ''
      },
      precio: Number(r.get('precio') ?? 0),
      imagen
    };
  });

  return { locale, messages, products };
};
