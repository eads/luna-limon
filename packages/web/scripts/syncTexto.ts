#!/usr/bin/env tsx
import 'dotenv/config';

import Airtable from 'airtable';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

type PreferSide = 'airtable' | 'local';

const args = process.argv.slice(2);
const prefer = parsePrefer(args);
const dryRun = args.includes('--dry-run') || args.includes('-n');

if (args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

const { AIRTABLE_TOKEN, AIRTABLE_BASE } = process.env as Record<string, string>;
const COPY_TABLE = process.env.AIRTABLE_COPY_TABLE || process.env.AIRTABLE_TABLE || 'texto';

if (!AIRTABLE_TOKEN || !AIRTABLE_BASE) {
  console.error('Missing AIRTABLE_TOKEN or AIRTABLE_BASE');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_TOKEN, requestTimeout: 30000 as any }).base(AIRTABLE_BASE);

interface AirtableRow {
  namespace: string;
  clave: string;
  texto_es: string;
  texto_en: string;
}

async function main() {
  if (prefer === 'airtable') {
    await pullFromAirtable();
  } else {
    await pushToAirtable();
  }
}

async function pullFromAirtable() {
  console.log(`Syncing '${COPY_TABLE}' → messages/{es,en}.json (prefer Airtable)`);
  const records = await withRetry(() => base(COPY_TABLE).select().all(), 'select texto');
  const es: Record<string, any> = { $schema: 'https://inlang.com/schema/inlang-message-format' };
  const en: Record<string, any> = { $schema: 'https://inlang.com/schema/inlang-message-format' };

  const setNested = (root: any, namespace: string, slug: string, value: string) => {
    if (!namespace) {
      root[slug] = value;
      return;
    }
    root[namespace] ??= {};
    const segments = slug.split('.');
    let cursor = root[namespace];
    for (let i = 0; i < segments.length - 1; i++) {
      const part = segments[i];
      cursor[part] ??= {};
      cursor = cursor[part];
    }
    cursor[segments[segments.length - 1]] = value;
  };

  for (const record of records) {
    const namespace = ((record.get('namespace') as string) || (record.get('ns') as string) || '').trim();
    const clave = ((record.get('clave') as string) || (record.get('key') as string) || '').trim();
    if (!clave) continue;
    const textoEs = (((record.get('texto_es') as string) || (record.get('es') as string) || '') as string).trimEnd();
    const textoEn = (((record.get('texto_en') as string) || (record.get('en') as string) || '') as string).trimEnd();
    if (textoEs) setNested(es, namespace, clave, textoEs);
    if (textoEn) setNested(en, namespace, clave, textoEn);
  }

  const outDir = join(process.cwd(), 'messages');
  mkdirSync(outDir, { recursive: true });
  const esTarget = join(outDir, 'es.json');
  const enTarget = join(outDir, 'en.json');
  const esJson = JSON.stringify(es, null, 2) + '\n';
  const enJson = JSON.stringify(en, null, 2) + '\n';
  const prevEs = readIfExists(esTarget);
  const prevEn = readIfExists(enTarget);
  const esChanged = prevEs !== esJson;
  const enChanged = prevEn !== enJson;

  if (dryRun) {
    console.log(esChanged ? "[dry-run] Would update messages/es.json" : 'messages/es.json already up to date');
    console.log(enChanged ? "[dry-run] Would update messages/en.json" : 'messages/en.json already up to date');
    return;
  }

  if (!esChanged && !enChanged) {
    console.log('messages/{es,en}.json already match Airtable');
    return;
  }

  if (esChanged) {
    writeFileSync(esTarget, esJson);
    console.log('Updated messages/es.json');
  } else {
    console.log('messages/es.json already up to date');
  }

  if (enChanged) {
    writeFileSync(enTarget, enJson);
    console.log('Updated messages/en.json');
  } else {
    console.log('messages/en.json already up to date');
  }
}

async function pushToAirtable() {
  console.log(`Syncing packages/web/messages/{es,en}.json → '${COPY_TABLE}' (prefer local)`);
  const es = loadMessages('es');
  const en = loadMessages('en');

  const namespaces = new Set<string>([
    ...Object.keys(es).filter((key) => key !== '$schema'),
    ...Object.keys(en).filter((key) => key !== '$schema')
  ]);

  const entries: AirtableRow[] = [];
  for (const namespace of namespaces) {
    const esMap = typeof es[namespace] === 'object' ? flatten(es[namespace]) : {};
    const enMap = typeof en[namespace] === 'object' ? flatten(en[namespace]) : {};
    const claves = new Set<string>([...Object.keys(esMap), ...Object.keys(enMap)]);
    for (const clave of claves) {
      entries.push({
        namespace,
        clave,
        texto_es: esMap[clave] ?? '',
        texto_en: enMap[clave] ?? ''
      });
    }
  }

  const existingRecords = await withRetry(() => base(COPY_TABLE).select().all(), 'select existing');
  const key = (namespace: string, clave: string) => `${namespace}::${clave}`;
  const existingByKey = new Map<string, Airtable.Record<any>>();
  for (const record of existingRecords) {
    const namespace = ((record.get('namespace') as string) || '').trim();
    const clave = ((record.get('clave') as string) || (record.get('key') as string) || '').trim();
    if (!namespace || !clave) continue;
    existingByKey.set(key(namespace, clave), record);
  }

  const toCreate: { fields: any }[] = [];
  const toUpdate: { id: string; fields: any }[] = [];

  for (const entry of entries) {
    const fields = {
      namespace: entry.namespace,
      clave: entry.clave,
      texto_es: entry.texto_es.trimEnd(),
      texto_en: entry.texto_en.trimEnd()
    };
    const existing = existingByKey.get(key(entry.namespace, entry.clave));
    if (!existing) {
      toCreate.push({ fields });
      continue;
    }
    const currentEs = ((existing.get('texto_es') as string) || (existing.get('es') as string) || '').trimEnd();
    const currentEn = ((existing.get('texto_en') as string) || (existing.get('en') as string) || '').trimEnd();
    if (currentEs !== fields.texto_es || currentEn !== fields.texto_en) {
      toUpdate.push({ id: existing.id, fields });
    }
  }

  console.log(`Prepared ${toCreate.length} creates, ${toUpdate.length} updates${dryRun ? ' (dry-run)' : ''}`);
  const batches = <T,>(items: T[]) =>
    Array.from({ length: Math.ceil(items.length / 10) }, (_, idx) => items.slice(idx * 10, idx * 10 + 10));

  if (dryRun) {
    reportPending('create', toCreate);
    reportPending('update', toUpdate);
    return;
  }

  if (!toCreate.length && !toUpdate.length) {
    console.log('Airtable already in sync');
    return;
  }

  for (const batch of batches(toCreate)) {
    await withRetry(() => base(COPY_TABLE).create(batch), `create ${batch.length}`);
  }
  for (const batch of batches(toUpdate)) {
    await withRetry(() => base(COPY_TABLE).update(batch), `update ${batch.length}`);
  }
  console.log('Airtable sync complete');
}

function parsePrefer(argv: string[]): PreferSide {
  for (const arg of argv) {
    if (arg === '--prefer=local' || arg === '--prefer local' || arg === '--local' || arg === '--push' || arg === '--from=local') {
      return 'local';
    }
    if (arg === '--prefer=airtable' || arg === '--prefer airtable' || arg === '--airtable' || arg === '--pull' || arg === '--from=airtable') {
      return 'airtable';
    }
    if (arg.startsWith('--prefer=')) {
      const value = arg.split('=')[1];
      if (value === 'local') return 'local';
      if (value === 'airtable') return 'airtable';
    }
    if (arg.startsWith('--from=')) {
      const value = arg.split('=')[1];
      if (value === 'local') return 'local';
      if (value === 'airtable') return 'airtable';
    }
  }
  return 'airtable';
}

function loadMessages(locale: 'es' | 'en') {
  const filePath = resolve(process.cwd(), 'messages', `${locale}.json`);
  return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, any>;
}

function flatten(namespaceObject: Record<string, any>) {
  const output: Record<string, string> = {};
  const walk = (node: any, trail: string[]) => {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$schema') continue;
      const next = [...trail, key];
      if (typeof value === 'string') {
        output[next.join('.')] = value.trimEnd();
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        walk(value, next);
      }
    }
  };
  walk(namespaceObject, []);
  return output;
}

async function withRetry<T>(fn: () => Promise<T>, label = 'op', attempts = 4): Promise<T> {
  let tries = 0;
  let lastError: any;
  while (tries < attempts) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const code = error?.code || error?.statusCode || error?.errno;
      if (
        ['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN'].includes(code) ||
        error?.type === 'system' ||
        (error?.statusCode && error.statusCode >= 500)
      ) {
        const wait = Math.min(2000, 300 * Math.pow(2, tries));
        console.warn(`${label} failed (${code ?? 'unknown'}). Retrying in ${wait}ms...`);
        await new Promise((resolve) => setTimeout(resolve, wait));
        tries += 1;
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

function printHelp() {
  console.log(`Usage: pnpm -F web texto:sync [--prefer=airtable|local] [--dry-run]

Options:
  --prefer=airtable   Pull from Airtable into local JSON (default).
  --prefer=local      Push local messages into Airtable.
  --dry-run           Show intended Airtable mutations without applying them.
  --help              Show this message.

Aliases:
  --pull / --airtable / --from=airtable  Prefer Airtable values.
  --push / --local / --from=local        Prefer local JSON values.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

function readIfExists(filename: string) {
  try {
    return readFileSync(filename, 'utf8');
  } catch {
    return null;
  }
}

function reportPending(kind: 'create' | 'update', entries: { fields: { namespace: string; clave: string } }[]) {
  const label = kind === 'create' ? 'create' : 'update';
  if (!entries.length) {
    console.log(`[dry-run] Nothing to ${label}`);
    return;
  }
  const sample = entries.slice(0, 5).map((entry) => `${entry.fields.namespace}.${entry.fields.clave}`);
  console.log(`[dry-run] Would ${label} ${entries.length} record${entries.length === 1 ? '' : 's'} (${sample.join(', ')}${entries.length > sample.length ? ', …' : ''})`);
}
