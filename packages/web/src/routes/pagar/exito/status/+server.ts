import { json } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { base } from '$lib/server/airtable';

const PEDIDO_TABLE = privateEnv.AIRTABLE_PEDIDO_TABLE || process.env.AIRTABLE_PEDIDO_TABLE || privateEnv.AIRTABLE_ORDERS_TABLE || process.env.AIRTABLE_ORDERS_TABLE || 'pedido';

export async function GET({ url, fetch }) {
  const wompiId = url.searchParams.get('id') || '';
  const pedidoId = url.searchParams.get('pedido-id') || '';
  const WOMPI_PRIVATE_KEY = privateEnv.WOMPI_PRIVATE_KEY || process.env.WOMPI_PRIVATE_KEY || '';
  const WOMPI_ENV = privateEnv.WOMPI_ENV || process.env.WOMPI_ENV; // optional override: 'test' | 'prod'
  const DEBUG = (privateEnv.DEBUG_ORDER || process.env.DEBUG_ORDER) === '1';

  if (!wompiId || !WOMPI_PRIVATE_KEY) {
    return json({ ok: false, message: 'missing wompiId or key' }, { status: 400 });
  }

  let wompiStatus: string | undefined;
  let wompiAmount: number | undefined;
  let wompiCurrency: string | undefined;
  let wompiReference: string | undefined;
  let finalEstado: 'Pagado' | 'Pago fallido' | undefined;

  try {
    const isTest = WOMPI_ENV === 'test' || WOMPI_PRIVATE_KEY.startsWith('prv_test');
    const baseUrl = isTest ? 'https://sandbox.wompi.co' : 'https://production.wompi.co';
    const verifyUrl = `${baseUrl}/v1/transactions/${encodeURIComponent(wompiId)}`;
    if (DEBUG) console.log('[status] verifying wompi', { pedidoId, wompiId, verifyUrl, env: isTest ? 'test' : 'prod' });
    const resp = await fetch(verifyUrl, {
      headers: { Authorization: `Bearer ${WOMPI_PRIVATE_KEY}` },
    });
    if (!resp.ok) throw new Error(`Wompi status ${resp.status}`);
    const data = await resp.json();
    const tx = data?.data;
    wompiStatus = tx?.status;
    wompiAmount = typeof tx?.amount_in_cents === 'number' ? tx.amount_in_cents : undefined;
    wompiCurrency = tx?.currency;
    wompiReference = tx?.reference;
    if (wompiStatus === 'APPROVED') finalEstado = 'Pagado';
    else if (['DECLINED', 'VOIDED', 'ERROR'].includes(wompiStatus || '')) finalEstado = 'Pago fallido';
    if (DEBUG) console.log('[status] wompi response', { status: wompiStatus, amount: wompiAmount, currency: wompiCurrency, reference: wompiReference, finalEstado });
  } catch (e: any) {
    if (DEBUG) console.error('[status] wompi verify error', e?.message || e);
    return json({ ok: false, message: e?.message || 'verify failed' }, { status: 502 });
  }

  // Update Airtable when we have a final state
  if (pedidoId && finalEstado) {
    try {
      const fields: Record<string, any> = { Estado: finalEstado };
      if (wompiId) fields['Wompi: Transacción ID'] = wompiId;
      if (wompiStatus) fields['Wompi: Estado'] = wompiStatus;
      if (wompiReference) fields['Wompi: Referencia'] = wompiReference;
      if (typeof wompiAmount === 'number' && Number.isFinite(wompiAmount)) fields['Wompi: Monto (centavos)'] = wompiAmount;
      if (wompiCurrency) fields['Wompi: Moneda'] = wompiCurrency;
      if (finalEstado === 'Pagado') fields['Pagado en'] = new Date().toISOString();
      if (DEBUG) console.log('[status] updating Airtable', { table: PEDIDO_TABLE, pedidoId, fields: Object.keys(fields) });
      try {
        await base(PEDIDO_TABLE).update(pedidoId, fields);
      } catch (e: any) {
        const msg = String(e?.message || e || '');
        if (DEBUG) console.error('[status] airtable update failed (first try)', msg);
        const retryFields = { ...fields };
        delete retryFields['Wompi: Monto (centavos)'];
        delete retryFields['Wompi: Moneda'];
        if (DEBUG) console.log('[status] retrying update without amount/currency');
        await base(PEDIDO_TABLE).update(pedidoId, retryFields);
      }
    } catch { /* ignore */ }
  }

  return json({
    ok: true,
    pedidoId,
    wompiId,
    wompiStatus,
    estado: finalEstado,
    wompiAmount,
    wompiCurrency,
    wompiReference,
  });
}
