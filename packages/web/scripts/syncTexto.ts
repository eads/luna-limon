#!/usr/bin/env tsx
import 'dotenv/config';
import Airtable from 'airtable';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const { AIRTABLE_TOKEN, AIRTABLE_BASE } = process.env as Record<string, string>;
const COPY_TABLE = process.env.AIRTABLE_COPY_TABLE || process.env.AIRTABLE_TABLE || 'texto';

if (!AIRTABLE_TOKEN || !AIRTABLE_BASE) {
  console.error('Missing AIRTABLE_TOKEN or AIRTABLE_BASE');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_TOKEN, requestTimeout: 30000 as any }).base(AIRTABLE_BASE);

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

async function run() {
  console.log(`Syncing '${COPY_TABLE}' from Airtable → messages/*.json`);
  const recs = await withRetry(() => base(COPY_TABLE).select().all(), 'select texto');
  // Desired output: nested under top-level namespace, splitting dots within clave
  // {
  //   carrito: { checkout: { placeholder: { name: "Your name" } } },
  //   calendario: { hero_title: "…" }
  // }
  const es: Record<string, any> = { "$schema": "https://inlang.com/schema/inlang-message-format" };
  const en: Record<string, any> = { "$schema": "https://inlang.com/schema/inlang-message-format" };

  const setNested = (root: any, ns: string, slug: string, value: string) => {
    if (!ns) {
      // If no namespace, write at root (rare)
      root[slug] = value;
      return;
    }
    root[ns] ??= {};
    const parts = slug.split('.');
    let cur = root[ns];
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      cur[p] ??= {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  };

  for (const r of recs) {
    const ns = (r.get('namespace') as string) || (r.get('ns') as string) || '';
    const key = (r.get('clave') as string) || (r.get('key') as string);
    if (!key) continue;
    const textEs = ((r.get('texto_es') as string) || (r.get('es') as string) || '').trimEnd();
    const textEn = ((r.get('texto_en') as string) || (r.get('en') as string) || '').trimEnd();
    if (textEs) setNested(es, ns, key, textEs);
    if (textEn) setNested(en, ns, key, textEn);
  }

  const outDir = join(process.cwd(), 'messages');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'es.json'), JSON.stringify(es, null, 2) + '\n');
  writeFileSync(join(outDir, 'en.json'), JSON.stringify(en, null, 2) + '\n');
  console.log('Wrote messages/es.json and messages/en.json');
}

run().catch((err) => { console.error(err); process.exit(1); });
