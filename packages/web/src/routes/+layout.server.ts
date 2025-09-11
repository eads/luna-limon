import type { LayoutServerLoad } from './$types';
import { base } from '$lib/server/airtable';
import { AIRTABLE_PRODUCTS_TABLE } from '$env/static/private';
// @ts-expect-error - runtime types not generated yet
import { getLocale } from '$lib/paraglide/runtime.js';

const COPY_TABLE = process.env.AIRTABLE_COPY_TABLE || process.env.AIRTABLE_TABLE || 'texto';

export const load: LayoutServerLoad = async ({ setHeaders }) => {
  const locale: 'en' | 'es' = getLocale();
  const stage = process.env.SST_STAGE ?? 'staging';
  const ttl = stage === 'production' ? 3600 : 300; // staging: 5m, production: 1h

  // Cache the HTML at the edge; stage-based TTL
  setHeaders({ 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=60` });

  // messages from texto table (tolerate Airtable outages)
  const messages: Record<string, { text: string }> = {};
  try {
    const textoRecords = await base(COPY_TABLE).select().all();
    for (const r of textoRecords) {
      const key = (r.get('clave') as string) || (r.get('key') as string);
      if (!key) continue;
      const raw = (r.get(`texto_${locale}`) as string) || (r.get(locale) as string);
      if (!raw) continue;
      messages[key] = { text: raw };
    }
  } catch (err) {
    console.error('Failed to load i18n messages from Airtable', err);
  }

  return { locale, messages };
};
