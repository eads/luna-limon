import type { LayoutServerLoad } from './$types';
import { base } from '$lib/server/airtable';
import fs from 'node:fs/promises';
import path from 'node:path';
import { AIRTABLE_PRODUCTS_TABLE } from '$env/static/private';
import { getLocale } from '$lib/paraglide/runtime.js';

const COPY_TABLE = process.env.AIRTABLE_COPY_TABLE || process.env.AIRTABLE_TABLE || 'texto';

export const load: LayoutServerLoad = async ({ setHeaders }) => {
  const locale: 'en' | 'es' = getLocale();
  const stage = process.env.SST_STAGE ?? 'staging';
  const isProd = stage === 'prod' || stage === 'production';
  const ttl = isProd ? 604800 : 300; // prod: 24h, staging/dev: 5m

  // Cache the HTML at the edge; stage-based TTL (avoid duplicate header errors in dev)
  try {
    setHeaders({ 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=60` });
  } catch {}

  // messages map (seed from local JSON, overlay from Airtable)
  const messages: Record<string, { text: string }> = {};

  // Seed defaults from local messages JSON (if available), assuming:
  // { carrito: { "checkout.place_order": "..." }, calendario: { ... } } or flat root { "carrito.checkout.place_order": "..." }
  try {
    const jsonPath = path.resolve(process.cwd(), 'messages', `${locale}.json`);
    const raw = await fs.readFile(jsonPath, 'utf8');
    const data: any = JSON.parse(raw);
    const add = (key: string, val: string) => { if (val != null) messages[key] = { text: String(val) }; };
    const walkNs = (ns: string, node: any, parts: string[] = []) => {
      for (const [k, v] of Object.entries(node || {})) {
        if (k === '$schema') continue;
        const next = [...parts, k];
        if (typeof v === 'string') add(`${ns}.${next.join('.')}`, v);
        else if (v && typeof v === 'object' && !Array.isArray(v)) walkNs(ns, v, next);
      }
    };
    for (const [k, v] of Object.entries(data)) {
      if (k === '$schema') continue;
      if (typeof v === 'string') add(k, v);
      else if (v && typeof v === 'object' && !Array.isArray(v)) walkNs(k, v as any);
    }
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
