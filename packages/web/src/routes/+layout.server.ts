import type { LayoutServerLoad } from './$types';
import { base } from '$lib/server/airtable';
import fs from 'node:fs/promises';
import path from 'node:path';
import { AIRTABLE_PRODUCTS_TABLE } from '$env/static/private';
// @ts-expect-error - runtime types not generated yet
import { getLocale } from '$lib/paraglide/runtime.js';

const COPY_TABLE = process.env.AIRTABLE_COPY_TABLE || process.env.AIRTABLE_TABLE || 'texto';

export const load: LayoutServerLoad = async ({ setHeaders }) => {
  const locale: 'en' | 'es' = getLocale();
  const stage = process.env.SST_STAGE ?? 'staging';
  const ttl = stage === 'production' ? 3600 : 300; // staging: 5m, production: 1h

  // Cache the HTML at the edge; stage-based TTL (avoid duplicate header errors in dev)
  try {
    setHeaders({ 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=60` });
  } catch {}

  // messages map (seed from local JSON, overlay from Airtable)
  const messages: Record<string, { text: string }> = {};

  // Flatten nested JSON into dotted keys (e.g. carrito.checkout.placeholder.name)
  function flatten(prefix: string, value: any) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [k, v] of Object.entries(value)) {
        if (k === '$schema') continue;
        const next = prefix ? `${prefix}.${k}` : k;
        flatten(next, v);
      }
      return;
    }
    if (typeof value === 'string') {
      messages[prefix] = { text: value };
    }
  }

  // Seed defaults from local messages JSON (if available)
  try {
    const jsonPath = path.resolve(process.cwd(), 'packages', 'web', 'messages', `${locale}.json`);
    const raw = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(raw);
    flatten('', data);
  } catch {}
  try {
    const textoRecords = await base(COPY_TABLE).select().all();
    for (const r of textoRecords) {
      const key = (r.get('clave') as string) || (r.get('key') as string);
      if (!key) continue;
      const raw = (r.get(`texto_${locale}`) as string) || (r.get(locale) as string);
      if (!raw) continue;
      // Optional namespacing support: if a namespace/scope/page field exists, also expose `${ns}.${key}`
      const ns =
        (r.get('namespace') as string) ||
        (r.get('ns') as string) ||
        (r.get('scope') as string) ||
        (r.get('page') as string) ||
        (r.get('slug') as string) ||
        '';
      messages[key] = { text: raw };
      if (ns) {
        const combined = `${ns}.${key}`;
        messages[combined] = { text: raw };
      }
    }
  } catch (err) {
    console.error('Failed to load i18n messages from Airtable', err);
  }

  return { locale, messages };
};
