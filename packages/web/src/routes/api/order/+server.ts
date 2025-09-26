import { json, error } from '@sveltejs/kit';
import { base } from '$lib/server/airtable';

// Table names (allow both English and Spanish envs, default Spanish)
const PEDIDO_TABLE = process.env.AIRTABLE_PEDIDO_TABLE || process.env.AIRTABLE_ORDERS_TABLE || 'pedido';
const DETALLE_PEDIDO_TABLE = process.env.AIRTABLE_DETALLE_PEDIDO_TABLE || process.env.AIRTABLE_ORDER_ITEMS_TABLE || 'detalle_pedido';
const PRODUCTS_TABLE = process.env.AIRTABLE_PRODUCTS_TABLE || 'Products';

// Optional real processor; today we mock success regardless
const WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY;
const WOMPI_REDIRECT_URL = process.env.WOMPI_REDIRECT_URL;

type IncomingItem = {
  product: { id: string; precio?: number };
  quantity: number;
};

export async function POST({ request, setHeaders, url }) {
  // Do not cache order responses
  setHeaders({ 'Cache-Control': 'no-store' });

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

  const totalInCents = detalleRecordsInput.reduce((sum, r) => sum + r.cantidad * r.precio * 100, 0);

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
  try {
    const pedidoRecord = await base(PEDIDO_TABLE).create(pedidoFields);
    pedidoId = pedidoRecord.id;
  } catch (e: any) {
    const detail = e?.error || e?.message || e;
    console.error('Airtable pedido create failed', e?.statusCode || e?.code, detail);
    return json(
      { ok: false, code: 'airtable_pedido_failed', message: 'No se pudo guardar el pedido', detail },
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
    for (let i = 0; i < detalleRecords.length; i += 10) {
      await base(DETALLE_PEDIDO_TABLE).create(detalleRecords.slice(i, i + 10));
    }
  } catch (e: any) {
    const detail = e?.error || e?.message || e;
    console.error('Airtable detalle_pedido create failed', e?.statusCode || e?.code, detail);
    return json(
      { ok: false, code: 'airtable_detalle_failed', message: 'No se pudo guardar los artículos del pedido', pedidoId, detail },
      { status: 502 }
    );
  }

  // 5) If Wompi is configured, build Hosted Checkout URL and return it
  if (WOMPI_PUBLIC_KEY) {
    const reference = `pedido-${pedidoId}`;
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

    const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}`;

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
