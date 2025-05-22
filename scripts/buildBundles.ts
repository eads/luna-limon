// scripts/buildBundles.ts
import Airtable from 'airtable'
import fs from 'node:fs/promises'

const { AIRTABLE_TOKEN, AIRTABLE_BASE, AIRTABLE_TABLE } = process.env
const base = new Airtable({ apiKey: AIRTABLE_TOKEN }).base(AIRTABLE_BASE)

const records = await base(AIRTABLE_TABLE).select().all()  // 1 API hit

const bundles: Record<string, Record<string, string>> = {}    // {en:{},es:{}}

for (const r of records) {
  const key = r.get('clave') as string
  for (const locale of ['en', 'es']) {
    bundles[locale] ??= {}
    bundles[locale][key] = r.get(`texto_${locale}`) as string
  }
}

for (const [locale, data] of Object.entries(bundles)) {
  await fs.writeFile(`static/i18n/${locale}.json`, JSON.stringify(data))
  // In prod you’d putObject to S3 here
}
