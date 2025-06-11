import 'dotenv/config';
import Airtable from 'airtable';
import fs from 'node:fs/promises';
import path from 'node:path';

const { AIRTABLE_TOKEN, AIRTABLE_BASE, AIRTABLE_TABLE } = process.env;
const base = new Airtable({ apiKey: AIRTABLE_TOKEN }).base(AIRTABLE_BASE);

const records = await base(AIRTABLE_TABLE).select().all();

const bundles: Record<string, Record<string, { variants: { value: string }[] }>> = {};

for (const record of records) {
  const key = record.get('clave') as string;
  if (!key) continue;

  for (const locale of ['en', 'es']) {
    const value = record.get(`texto_${locale}`) as string;
    if (!value) continue;

    bundles[locale] ??= {};
    bundles[locale][key] = value;
  }
}

const outDir = path.resolve('messages');
await fs.mkdir(outDir, { recursive: true });

for (const [locale, messages] of Object.entries(bundles)) {
  const filePath = path.join(outDir, `${locale}.json`);
  const fileContent = {
    $schema: 'https://inlang.com/schema/message',
    ...messages
  };
  await fs.writeFile(filePath, JSON.stringify(fileContent, null, 2));
  console.log(`✅ Wrote ${filePath}`);
}
