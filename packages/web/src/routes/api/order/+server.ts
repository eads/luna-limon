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
    // fecha_entrega removed during pre-order
    ciudad,
    departamento,
    codigo_postal,
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
  if (ciudad) pedidoFields["Ciudad"] = ciudad;
  if (departamento) pedidoFields["Departamento"] = departamento;
  if (codigo_postal) pedidoFields["Código postal"] = codigo_postal;
  if (notas_cliente) pedidoFields["Notas del cliente"] = notas_cliente;
  pedidoFields["Estado"] = estado || 'Iniciado';
  // Mark environment for filtering in the main base
  try {
    const isTest = (privateEnv.WOMPI_ENV === 'test') || ((privateEnv.WOMPI_PRIVATE_KEY || '').startsWith('prv_test'));
    pedidoFields["Entorno"] = isTest ? 'Pruebas' : 'Producción';
  } catch {}
  // Capture order creation timestamp with time component
  try { pedidoFields["Fecha pedido"] = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); } catch {}

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

  // Compute totals including shipping
  const itemsTotalCents = detalleRecordsInput.reduce((sum, r) => sum + r.cantidad * r.precio * 100, 0);
  const shipBogota = Number(privateEnv.SHIP_BOGOTA_CENTS || process.env.SHIP_BOGOTA_CENTS || 0) || 0;
  const shipNational = Number(privateEnv.SHIP_NATIONAL_CENTS || process.env.SHIP_NATIONAL_CENTS || 0) || 0;
  const isBogota = (name?: string) => {
    if (!name) return false;
    const n = String(name).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    return n.includes('bogota');
  };
  const shippingInCents = isBogota(ciudad) ? shipBogota : shipNational;
  const totalInCents = Math.round(itemsTotalCents + shippingInCents);
  if (shippingInCents > 0) {
    try { (pedidoFields as any)["Costo de envío (centavos)"] = shippingInCents; } catch {}
  }

  // 5) If Wompi is configured, build Hosted Checkout URL and return it
  if (WOMPI_PUBLIC_KEY) {
    // Generate a unique transaction reference per attempt to avoid reusing a prior session
    const uniqueSuffix = Math.random().toString(36).slice(2, 8);
    const reference = `pedido-${pedidoId}-${uniqueSuffix}`;
    const redirect = (() => {
      const stage = (privateEnv.SST_STAGE || process.env.SST_STAGE || '').toString();
      // Default to current origin
      const defaultUrl = new URL('/pagar/exito', url);
      defaultUrl.searchParams.set('pedido-id', pedidoId);
      // Only honor WOMPI_REDIRECT_URL in non-prod stages to avoid accidental localhost in prod
      if (WOMPI_REDIRECT_URL && stage !== 'prod') {
        try {
          const candidate = new URL(WOMPI_REDIRECT_URL, url);
          candidate.searchParams.set('pedido-id', pedidoId);
          return candidate.toString();
        } catch {}
      }
      return defaultUrl.toString();
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
    // Prefill full name and phone number when available
    if (nombre) {
      params.set('customer-data:full-name', String(nombre));
    }
    if (numero_whatsapp) {
      const digits = String(numero_whatsapp).replace(/\D+/g, '');
      let prefix = '57';
      let local = digits;
      if (digits.startsWith('57') && digits.length >= 12) {
        prefix = '57';
        local = digits.slice(-10);
      } else if (digits.length === 10) {
        prefix = '57';
        local = digits;
      }
      params.set('customer-data:phone-number', local);
      params.set('customer-data:phone-number-prefix', prefix);
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
    } else if (DEBUG) {
      console.warn('[order] WOMPI_INTEGRITY_KEY not set; integrity signature will not be sent');
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
