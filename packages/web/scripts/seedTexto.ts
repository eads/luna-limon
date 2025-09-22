#!/usr/bin/env tsx
import 'dotenv/config';
/**
 * Seed/update texto (i18n) rows in Airtable from local messages JSON.
 * - Uses env: AIRTABLE_TOKEN, AIRTABLE_BASE, AIRTABLE_COPY_TABLE (default: 'texto')
 * - Upserts by (namespace, clave)
 * - Batches create/update in chunks of 10
 */
import Airtable from 'airtable';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const { AIRTABLE_TOKEN, AIRTABLE_BASE } = process.env as Record<string, string>;
const COPY_TABLE = process.env.AIRTABLE_COPY_TABLE || process.env.AIRTABLE_TABLE || 'texto';

if (!AIRTABLE_TOKEN || !AIRTABLE_BASE) {
  console.error('Missing AIRTABLE_TOKEN or AIRTABLE_BASE');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_TOKEN, requestTimeout: 30000 as any }).base(AIRTABLE_BASE);

type Entry = { namespace: string; clave: string; texto_es: string; texto_en: string };

function loadMessages(locale: 'es' | 'en') {
  const p = resolve(process.cwd(), 'messages', `${locale}.json`);
  return JSON.parse(readFileSync(p, 'utf8')) as any;
}

function flatten(nsObj: any): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (node: any, parts: string[]) => {
    for (const [k, v] of Object.entries(node)) {
      if (k === '$schema') continue;
      const next = [...parts, k];
      if (typeof v === 'string') out[next.join('.')] = v.trimEnd();
      else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, next);
    }
  };
  walk(nsObj, []);
  return out;
}

async function run() {
  console.log(`Seeding '${COPY_TABLE}' from packages/web/messages/{en,es}.json → Airtable`);
  const es = loadMessages('es');
  const en = loadMessages('en');
  const namespaces = new Set<string>([
    ...Object.keys(es).filter((k) => k !== '$schema'),
    ...Object.keys(en).filter((k) => k !== '$schema'),
  ]);

  const entries: Entry[] = [];
  for (const ns of namespaces) {
    const esMap = typeof es[ns] === 'object' ? flatten(es[ns]) : {};
    const enMap = typeof en[ns] === 'object' ? flatten(en[ns]) : {};
    const claves = new Set<string>([...Object.keys(esMap), ...Object.keys(enMap)]);
    for (const clave of claves) {
      entries.push({ namespace: ns, clave, texto_es: esMap[clave] || '', texto_en: enMap[clave] || '' });
    }
  }

  // Load existing (namespace, clave) -> record
  const existingRecs = await withRetry(() => base(COPY_TABLE).select().all(), 'select existing');
  const key = (ns: string, k: string) => `${ns}::${k}`;
  const byKey = new Map<string, Airtable.Record<any>>();
  for (const r of existingRecs) {
    const ns = (r.get('namespace') as string) || '';
    const clave = (r.get('clave') as string) || (r.get('key') as string) || '';
    if (!ns || !clave) continue;
    byKey.set(key(ns, clave), r);
  }

  const toCreate: { fields: any }[] = [];
  const toUpdate: { id: string; fields: any }[] = [];
  for (const e of entries) {
    const fields = { namespace: e.namespace, clave: e.clave, texto_es: e.texto_es, texto_en: e.texto_en };
    const existing = byKey.get(key(e.namespace, e.clave));
    if (!existing) toCreate.push({ fields });
    else {
      const curEs = (existing.get('texto_es') as string) || (existing.get('es') as string) || '';
      const curEn = (existing.get('texto_en') as string) || (existing.get('en') as string) || '';
      if (curEs !== e.texto_es || curEn !== e.texto_en) toUpdate.push({ id: existing.id, fields });
    }
  }

  const chunk = <T,>(arr: T[], n = 10) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
  for (const batch of chunk(toCreate)) await withRetry(() => base(COPY_TABLE).create(batch), `create ${batch.length}`);
  for (const batch of chunk(toUpdate)) await withRetry(() => base(COPY_TABLE).update(batch), `update ${batch.length}`);
  console.log(`Done. Created=${toCreate.length}, Updated=${toUpdate.length}`);
}

run().catch((err) => { console.error(err); process.exit(1); });

async function withRetry<T>(fn: () => Promise<T>, label = 'op', tries = 4): Promise<T> {
  let attempt = 0;
  let lastErr: any;
  while (attempt < tries) {
    try { return await fn(); } catch (err: any) {
      lastErr = err;
      const code = err?.code || err?.statusCode || err?.errno;
      if (['ETIMEDOUT','ECONNRESET','EAI_AGAIN'].includes(code) || err?.type === 'system' || (err?.statusCode && err.statusCode >= 500)) {
        const backoff = Math.min(2000, 300 * Math.pow(2, attempt));
        console.warn(`${label} failed (${code}). Retrying in ${backoff}ms...`);
        await new Promise((r) => setTimeout(r, backoff));
        attempt++; continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
