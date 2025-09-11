#!/usr/bin/env tsx
/**
 * Seed/update texto (i18n) rows in Airtable.
 * - Uses env: AIRTABLE_TOKEN, AIRTABLE_BASE, AIRTABLE_COPY_TABLE (default: 'texto')
 * - Upserts by (namespace, clave)
 * - Batches create/update in chunks of 10
 */
import Airtable from 'airtable';

const { AIRTABLE_TOKEN, AIRTABLE_BASE } = process.env as Record<string, string>;
const COPY_TABLE = process.env.AIRTABLE_COPY_TABLE || process.env.AIRTABLE_TABLE || 'texto';

if (!AIRTABLE_TOKEN || !AIRTABLE_BASE) {
  console.error('Missing AIRTABLE_TOKEN or AIRTABLE_BASE');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_TOKEN }).base(AIRTABLE_BASE);

type Entry = {
  namespace: string;
  clave: string;
  texto_es: string;
  texto_en: string;
};

const entries: Entry[] = [
  // carrito / checkout flow
  { namespace: 'carrito', clave: 'checkout.title', texto_es: 'Finalizar pedido', texto_en: 'Finish your order' },
  { namespace: 'carrito', clave: 'checkout.name', texto_es: 'Nombre', texto_en: 'Name' },
  { namespace: 'carrito', clave: 'checkout.email', texto_es: 'Correo electrónico', texto_en: 'Email' },
  { namespace: 'carrito', clave: 'checkout.whatsapp', texto_es: 'Número de WhatsApp', texto_en: 'WhatsApp number' },
  { namespace: 'carrito', clave: 'checkout.address', texto_es: 'Dirección de envío', texto_en: 'Shipping address' },
  { namespace: 'carrito', clave: 'checkout.delivery_date', texto_es: 'Fecha de entrega', texto_en: 'Delivery date' },
  { namespace: 'carrito', clave: 'checkout.notes', texto_es: 'Notas para tu pedido', texto_en: 'Notes for your order' },
  { namespace: 'carrito', clave: 'checkout.summary', texto_es: 'Resumen', texto_en: 'Summary' },
  { namespace: 'carrito', clave: 'checkout.total', texto_es: 'Total', texto_en: 'Total' },
  { namespace: 'carrito', clave: 'checkout.place_order', texto_es: 'Realizar pedido', texto_en: 'Place order' },
  { namespace: 'carrito', clave: 'checkout.processing', texto_es: 'Procesando…', texto_en: 'Processing…' },
  { namespace: 'carrito', clave: 'checkout.error', texto_es: 'No se pudo procesar el pedido. Intente de nuevo.', texto_en: "Couldn't process the order. Please try again." },
  { namespace: 'carrito', clave: 'success.title', texto_es: '¡Gracias por tu pedido!', texto_en: 'Thank you for your order!' },
  { namespace: 'carrito', clave: 'success.order_number', texto_es: 'Tu número de pedido es:', texto_en: 'Your order number is:' },
  { namespace: 'carrito', clave: 'success.back_to_catalog', texto_es: 'Volver al catálogo', texto_en: 'Back to catalog' },

  // calendario page
  { namespace: 'calendario', clave: 'titulo', texto_es: 'Calendario', texto_en: 'Calendar' },
  { namespace: 'calendario', clave: 'hero_title', texto_es: 'Un calendario para saborear el año', texto_en: 'A calendar to savor the year' },
  { namespace: 'calendario', clave: 'hero_subtitle', texto_es: '12 ilustraciones, recetas y momentos para reunirnos', texto_en: '12 illustrations, recipes, and moments to gather' },
  { namespace: 'calendario', clave: 'buy', texto_es: 'Comprar calendario', texto_en: 'Buy calendar' },
  { namespace: 'calendario', clave: 'vacio', texto_es: 'No hay productos de calendario.', texto_en: 'No calendar products.' },
  { namespace: 'calendario', clave: 'f1_title', texto_es: 'Arte que inspira cada mes', texto_en: 'Art that inspires every month' },
  { namespace: 'calendario', clave: 'f1_body', texto_es: 'Ilustraciones originales impresas con tintas de alta calidad.', texto_en: 'Original illustrations printed with high-quality inks.' },
  { namespace: 'calendario', clave: 'f2_title', texto_es: 'Recetas estacionales', texto_en: 'Seasonal recipes' },
  { namespace: 'calendario', clave: 'f2_body', texto_es: 'Ideas sencillas y deliciosas para compartir en casa.', texto_en: 'Simple, delicious ideas to share at home.' },
  { namespace: 'calendario', clave: 'f3_title', texto_es: 'Papel sustentable', texto_en: 'Sustainable paper' },
  { namespace: 'calendario', clave: 'f3_body', texto_es: 'Hecho con materiales responsables con el planeta.', texto_en: 'Made with materials that care for the planet.' },
  { namespace: 'calendario', clave: 'f4_title', texto_es: 'Listo para regalar', texto_en: 'Gift-ready' },
  { namespace: 'calendario', clave: 'f4_body', texto_es: 'Empaque hermoso para que llegue con cariño.', texto_en: 'Beautiful packaging to deliver with care.' },
];

function key(ns: string, k: string) {
  return `${ns}::${k}`;
}

async function run() {
  console.log(`Upserting ${entries.length} texto rows into '${COPY_TABLE}' with namespace='${NS}'`);

  // Load existing (namespace, clave) -> record
  const filter = `OR(namespace = 'carrito', namespace = 'calendario')`;
  const existing = await base(COPY_TABLE).select({ filterByFormula: filter }).all();
  const byKey = new Map<string, Airtable.Record<any>>();
  for (const r of existing) {
    const ns = (r.get('namespace') as string) || '';
    const clave = (r.get('clave') as string) || (r.get('key') as string) || '';
    if (!ns || !clave) continue;
    byKey.set(key(ns, clave), r);
  }

  const toCreate: { fields: any }[] = [];
  const toUpdate: { id: string; fields: any }[] = [];

  for (const e of entries) {
    const existing = byKey.get(key(e.namespace, e.clave));
    const fields = {
      namespace: e.namespace,
      clave: e.clave,
      texto_es: e.texto_es,
      texto_en: e.texto_en,
    };
    if (!existing) {
      toCreate.push({ fields });
    } else {
      const curEs = (existing.get('texto_es') as string) || (existing.get('es') as string) || '';
      const curEn = (existing.get('texto_en') as string) || (existing.get('en') as string) || '';
      if (curEs !== e.texto_es || curEn !== e.texto_en) {
        toUpdate.push({ id: existing.id, fields });
      }
    }
  }

  const chunk = <T,>(arr: T[], n = 10) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

  for (const batch of chunk(toCreate)) {
    try {
      await base(COPY_TABLE).create(batch);
      console.log(`Created ${batch.length}`);
    } catch (err: any) {
      console.error('Create failed:', err?.statusCode || err?.code || err?.message || err);
      if (err?.statusCode === 401 || err?.statusCode === 403) {
        console.error('Hint: Ensure your Airtable Personal Access Token has data.records:write and access to this base/table.');
      }
      throw err;
    }
  }
  for (const batch of chunk(toUpdate)) {
    try {
      await base(COPY_TABLE).update(batch);
      console.log(`Updated ${batch.length}`);
    } catch (err: any) {
      console.error('Update failed:', err?.statusCode || err?.code || err?.message || err);
      if (err?.statusCode === 401 || err?.statusCode === 403) {
        console.error('Hint: Ensure your Airtable Personal Access Token has data.records:write and access to this base/table.');
      }
      throw err;
    }
  }

  console.log(`Done. Created=${toCreate.length}, Updated=${toUpdate.length}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
