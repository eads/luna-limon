import { json } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { base } from '$lib/server/airtable';

const PEDIDO_TABLE = privateEnv.AIRTABLE_PEDIDO_TABLE || process.env.AIRTABLE_PEDIDO_TABLE || privateEnv.AIRTABLE_ORDERS_TABLE || process.env.AIRTABLE_ORDERS_TABLE || 'pedido';

export async function POST({ request, url, fetch }) {
  const DEBUG = (privateEnv.DEBUG_ORDER || process.env.DEBUG_ORDER) === '1';
  if (DEBUG) {
    const eventId = request.headers.get('x-event-id') || '';
    const secretHdr = request.headers.get('x-webhook-secret') ? 'yes' : 'no';
    console.log('[wompi-webhook] hit', {
      method: request.method,
      path: url.pathname,
      eventId,
      hasSecretHeader: secretHdr,
      search: url.search
    });
  }
  const configuredSecret = privateEnv.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || '';
  const providedSecret = request.headers.get('x-webhook-secret') || url.searchParams.get('secret') || '';
  if (configuredSecret && providedSecret !== configuredSecret) {
    if (DEBUG) console.error('[wompi-webhook] unauthorized');
    return json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'invalid json' }, { status: 400 });
  }

  // Optionally verify by pulling the event from Wompi using the Events API Key
  const eventsKey = privateEnv.WOMPI_EVENTS_KEY || process.env.WOMPI_EVENTS_KEY || '';
  const wompiEnv = privateEnv.WOMPI_ENV || process.env.WOMPI_ENV;
  const eventId = request.headers.get('x-event-id') || '';
  if (eventsKey && eventId) {
    try {
      const isTest = wompiEnv === 'test' || eventsKey.startsWith('test_events');
      const baseUrl = isTest ? 'https://sandbox.wompi.co' : 'https://production.wompi.co';
      const evUrl = `${baseUrl}/v1/events/${encodeURIComponent(eventId)}`;
      if (DEBUG) console.log('[wompi-webhook] verifying via Events API', { evUrl, env: isTest ? 'test' : 'prod' });
      const resp = await fetch(evUrl, { headers: { Authorization: `Bearer ${eventsKey}` } });
      if (resp.ok) {
        const eventData = await resp.json();
        if (DEBUG) console.log('[wompi-webhook] event fetched ok');
        // Prefer the verified payload
        body = eventData?.data || eventData || body;
      } else if (DEBUG) {
        console.error('[wompi-webhook] events fetch failed', resp.status);
      }
    } catch (e: any) {
      if (DEBUG) console.error('[wompi-webhook] events fetch error', e?.message || e);
    }
  }

  // Wompi event shapes can vary; try common structures
  const tx = body?.transaction || body?.data?.transaction || body?.data || body;
  const wompiId: string | undefined = tx?.id;
  const wompiStatus: string | undefined = tx?.status;
  const wompiReference: string | undefined = tx?.reference;
  const wompiAmount: number | undefined = typeof tx?.amount_in_cents === 'number' ? tx.amount_in_cents : undefined;
  const wompiCurrency: string | undefined = tx?.currency;

  if (DEBUG) console.log('[wompi-webhook] received', { wompiId, wompiStatus, wompiReference, wompiAmount, wompiCurrency });

  // Extract pedido id from reference like: pedido-<id>-<suffix>
  let pedidoId = '';
  if (typeof wompiReference === 'string' && wompiReference.startsWith('pedido-')) {
    const m = wompiReference.match(/^pedido-([^\-]+)-/);
    if (m) pedidoId = m[1];
  }
  // Allow explicit param override for testing
  if (!pedidoId) pedidoId = url.searchParams.get('pedido-id') || '';

  // Determine final estado
  let finalEstado: 'Pagado' | 'Pago fallido' | undefined;
  if (wompiStatus === 'APPROVED') finalEstado = 'Pagado';
  else if (['DECLINED', 'VOIDED', 'ERROR'].includes(wompiStatus || '')) finalEstado = 'Pago fallido';

  if (!pedidoId || !wompiId || !finalEstado) {
    if (DEBUG) console.log('[wompi-webhook] insufficient data to update', { pedidoId, wompiId, wompiStatus, finalEstado });
    return json({ ok: true, message: 'received' });
  }

  // Update Airtable
  try {
    const fields: Record<string, any> = { Estado: finalEstado };
    fields['Wompi: Transacción ID'] = wompiId;
    if (wompiStatus) fields['Wompi: Estado'] = wompiStatus;
    if (wompiReference) fields['Wompi: Referencia'] = wompiReference;
    if (typeof wompiAmount === 'number' && Number.isFinite(wompiAmount)) fields['Wompi: Monto (centavos)'] = wompiAmount;
    if (wompiCurrency) fields['Wompi: Moneda'] = wompiCurrency;
    if (finalEstado === 'Pagado') fields['Fecha de pagado'] = new Date().toISOString();
    if (DEBUG) console.log('[wompi-webhook] updating Airtable', { table: PEDIDO_TABLE, pedidoId, fields: Object.keys(fields) });
    await base(PEDIDO_TABLE).update(pedidoId, fields);
  } catch (e) {
    if (DEBUG) console.error('[wompi-webhook] airtable update failed', (e as any)?.message || e);
    return json({ ok: false, message: 'airtable update failed' }, { status: 500 });
  }

  return json({ ok: true });
}
