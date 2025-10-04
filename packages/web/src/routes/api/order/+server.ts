import { json, error } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { createHash } from 'crypto';
import { base } from '$lib/server/airtable';

// Table names (allow both English and Spanish envs, default Spanish)
const PEDIDO_TABLE = privateEnv.AIRTABLE_PEDIDO_TABLE || process.env.AIRTABLE_PEDIDO_TABLE || privateEnv.AIRTABLE_ORDERS_TABLE || process.env.AIRTABLE_ORDERS_TABLE || 'pedido';
const DETALLE_PEDIDO_TABLE = privateEnv.AIRTABLE_DETALLE_PEDIDO_TABLE || process.env.AIRTABLE_DETALLE_PEDIDO_TABLE || privateEnv.AIRTABLE_ORDER_ITEMS_TABLE || process.env.AIRTABLE_ORDER_ITEMS_TABLE || 'detalle_pedido';
const PRODUCTS_TABLE = privateEnv.AIRTABLE_PRODUCTS_TABLE || process.env.AIRTABLE_PRODUCTS_TABLE || 'Products';

// Optional real processor; today we mock success regardless
const WOMPI_PUBLIC_KEY = privateEnv.WOMPI_PUBLIC_KEY || process.env.WOMPI_PUBLIC_KEY;
const WOMPI_REDIRECT_URL = privateEnv.WOMPI_REDIRECT_URL || process.env.WOMPI_REDIRECT_URL;
const WOMPI_INTEGRITY_KEY = privateEnv.WOMPI_INTEGRITY_KEY || process.env.WOMPI_INTEGRITY_KEY;

type IncomingItem = {
  product: { id: string; precio?: number };
  quantity: number;
};

export async function POST({ request, setHeaders, url }) {
  // Do not cache order responses
  setHeaders({ 'Cache-Control': 'no-store' });
  const DEBUG = process.env.DEBUG_ORDER === '1';

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    throw error(400, 'invalid json');
  }

  const {
    nombre,
    correo_electronico,
    direccion_envio,
    fecha_entrega, // ISO date string or undefined
    notas_cliente,
    estado, // optional override
    phone, // existing field used for numero_whatsapp
    items,
  } = payload || {};

  if (!Array.isArray(items) || items.length === 0) throw error(400, 'items required');

  // Basic input normalization
  const numero_whatsapp = phone || payload?.numero_whatsapp || '';

  // 1) Recalculate item prices from Airtable to avoid trusting client
  const itemsIn: IncomingItem[] = items as IncomingItem[];
  const productIds = [...new Set(itemsIn.map((i) => i.product?.id).filter(Boolean))] as string[];
  const priceMap = new Map<string, number>();
  if (productIds.length) {
    // Airtable SDK: select by filterByFormula with OR( RECORD_ID()='id1', ... )
    const chunks: string[][] = [];
    for (let i = 0; i < productIds.length; i += 10) chunks.push(productIds.slice(i, i + 10));
    for (const batch of chunks) {
      const filter = `OR(${batch.map((id) => `RECORD_ID()='${id}'`).join(',')})`;
      const recs = await base(PRODUCTS_TABLE).select({ filterByFormula: filter }).all();
      for (const r of recs) priceMap.set(r.id, Number(r.get('precio') ?? 0));
    }
  }

  // 2) Prepare detalle records and compute total
  const detalleRecordsInput = itemsIn.map((i) => {
    const pid = i.product?.id;
    const cantidad = Number(i.quantity ?? 0) || 0;
    const precio = (priceMap.get(pid!) ?? Number(i.product?.precio ?? 0)) || 0;
    return { pid, cantidad, precio };
  });

  const totalInCentsRaw = detalleRecordsInput.reduce((sum, r) => sum + r.cantidad * r.precio * 100, 0);
  const totalInCents = Math.round(totalInCentsRaw);

  // 3) Create pedido with status "Iniciado" (or provided override)
  const pedidoFields: Record<string, any> = {};
  if (nombre) pedidoFields["Nombre"] = nombre;
  if (correo_electronico) pedidoFields["Correo electrónico"] = correo_electronico;
  if (numero_whatsapp) pedidoFields["Número de WhatsApp"] = numero_whatsapp;
  if (direccion_envio) pedidoFields["Dirección de envío"] = direccion_envio;
  if (fecha_entrega) pedidoFields["Fecha de entrega"] = fecha_entrega; // Expecting YYYY-MM-DD from UI
  if (notas_cliente) pedidoFields["Notas del cliente"] = notas_cliente;
  pedidoFields["Estado"] = estado || 'Iniciado';

  let pedidoId: string;
  if (DEBUG) {
    console.log('[order] Creating pedido with fields:', Object.keys(pedidoFields));
  }
  try {
    const pedidoRecord = await base(PEDIDO_TABLE).create(pedidoFields);
    pedidoId = pedidoRecord.id;
  } catch (e: any) {
    const detail = e?.error || e?.message || e;
    // Try to extract the offending field from Airtable's error message
    let offendingField: string | undefined;
    const msg = String(e?.message || e?.error || '');
    const m1 = msg.match(/Unknown field name:?\s*"?([^"\n]+)"?/i);
    const m2 = msg.match(/Could not find field\s+"([^"\n]+)"/i);
    offendingField = (m1 && m1[1]) || (m2 && m2[1]) || undefined;
    console.error('Airtable pedido create failed', e?.statusCode || e?.code, detail, {
      table: PEDIDO_TABLE,
      fields: Object.keys(pedidoFields),
      offendingField,
    });
    return json(
      { ok: false, code: 'airtable_pedido_failed', message: 'No se pudo guardar el pedido', detail, offendingField },
      { status: 502 }
    );
  }

  // 4) Create detalle_pedido rows linked to pedido
  const detalleRecords = detalleRecordsInput.map((r) => ({
    fields: {
      "Cantidad": r.cantidad,
      "Precio unitario": r.precio,
      "Pedido": [pedidoId],
      "Producto": r.pid ? [r.pid] : [],
    },
  }));

  // Airtable allows up to 10 per batch create
  try {
    if (DEBUG) {
      console.log('[order] Creating detalle_pedido records:', detalleRecords.length, 'table:', DETALLE_PEDIDO_TABLE, 'fields:', ['Cantidad','Precio unitario','Pedido','Producto']);
    }
    for (let i = 0; i < detalleRecords.length; i += 10) {
      await base(DETALLE_PEDIDO_TABLE).create(detalleRecords.slice(i, i + 10));
    }
  } catch (e: any) {
    const detail = e?.error || e?.message || e;
    console.error('Airtable detalle_pedido create failed', e?.statusCode || e?.code, detail, {
      table: DETALLE_PEDIDO_TABLE,
      batchSize: detalleRecords.length,
      sample: detalleRecords[0]?.fields ? Object.keys(detalleRecords[0].fields) : [],
    });
    return json(
      { ok: false, code: 'airtable_detalle_failed', message: 'No se pudo guardar los artículos del pedido', pedidoId, detail },
      { status: 502 }
    );
  }

  // 5) If Wompi is configured, build Hosted Checkout URL and return it
  if (WOMPI_PUBLIC_KEY) {
    // Generate a unique transaction reference per attempt to avoid reusing a prior session
    const uniqueSuffix = Math.random().toString(36).slice(2, 8);
    const reference = `pedido-${pedidoId}-${uniqueSuffix}`;
    const redirect = (() => {
      if (WOMPI_REDIRECT_URL) return WOMPI_REDIRECT_URL;
      // Use current origin; include pedidoId so the success page can update status
      const u = new URL('/pagar/exito', url);
      u.searchParams.set('pedidoId', pedidoId);
      return u.toString();
    })();

    const params = new URLSearchParams({
      'public-key': WOMPI_PUBLIC_KEY,
      currency: 'COP',
      'amount-in-cents': String(totalInCents),
      reference,
      'redirect-url': redirect,
    });

    // Prefill customer email when available (Wompi supports customer-data:email)
    if (correo_electronico) {
      params.set('customer-data:email', String(correo_electronico));
    }

    // Integrity signature (if merchant setting requires it)
    if (WOMPI_INTEGRITY_KEY) {
      // Per Wompi Hosted Checkout docs, signature = sha256(reference + amount_in_cents + currency + integrity_key)
      const signatureBase = `${reference}${totalInCents}COP${WOMPI_INTEGRITY_KEY}`;
      const signature = createHash('sha256').update(signatureBase).digest('hex');
      params.set('signature:integrity', signature);
      if (DEBUG) {
        console.log('[order] Wompi integrity included', {
          reference,
          amount_in_cents: totalInCents,
          currency: 'COP',
          signature_preview: signature.slice(0, 8) + '…',
        });
      }
    }

    const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}`;
    if (DEBUG) console.log('[order] Wompi checkout URL:', checkoutUrl);

    // Best-effort: store Wompi metadata on the pedido for reconciliation
    try {
      await base(PEDIDO_TABLE).update(pedidoId, {
        'Wompi: Referencia': reference,
        'Wompi: Moneda': 'COP',
        'Wompi: Monto (centavos)': totalInCents,
      } as any);
    } catch (e) {
      // ignore non-fatal errors
    }
    return json({ checkoutUrl, pedidoId });
  }

  // 6) Fallback: mock payment success when Wompi is not configured
  const payment = { ok: true, status: 'success', id: `mock_${Date.now()}` };
  return json({ ok: true, payment, pedidoId });
}
