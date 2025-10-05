import type { PageServerLoad } from './$types';
import { base } from '$lib/server/airtable';
import { env as privateEnv } from '$env/dynamic/private';

const PEDIDO_TABLE = privateEnv.AIRTABLE_PEDIDO_TABLE || process.env.AIRTABLE_PEDIDO_TABLE || privateEnv.AIRTABLE_ORDERS_TABLE || process.env.AIRTABLE_ORDERS_TABLE || 'pedido';

export const load: PageServerLoad = async ({ url, fetch }) => {
  const pedidoId = url.searchParams.get('pedido-id') || '';
  const wompiId = url.searchParams.get('id') || '';

  const WOMPI_PRIVATE_KEY = privateEnv.WOMPI_PRIVATE_KEY || process.env.WOMPI_PRIVATE_KEY;
  const WOMPI_ENV = privateEnv.WOMPI_ENV || process.env.WOMPI_ENV; // optional override: 'test' | 'prod'
  const DEBUG = (privateEnv.DEBUG_ORDER || process.env.DEBUG_ORDER) === '1';

  let wompiStatus: string | undefined;
  let finalEstado: 'Pagado' | 'Pago fallido' | undefined;
  let wompiAmount: number | undefined;
  let wompiCurrency: string | undefined;
  let wompiReference: string | undefined;
  let error: string | undefined;

  // Query Wompi if we have a transaction id and a private key
  if (wompiId && WOMPI_PRIVATE_KEY) {
    try {
      const isTest = WOMPI_ENV === 'test' || WOMPI_PRIVATE_KEY.startsWith('prv_test');
      const baseUrl = isTest ? 'https://sandbox.wompi.co' : 'https://production.wompi.co';
      const verifyUrl = `${baseUrl}/v1/transactions/${encodeURIComponent(wompiId)}`;
      if (DEBUG) console.log('[exito] verifying wompi', { pedidoId, wompiId, verifyUrl, env: isTest ? 'test' : 'prod' });
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
      if (wompiStatus === 'APPROVED') {
        finalEstado = 'Pagado';
      } else if (['DECLINED', 'VOIDED', 'ERROR'].includes(wompiStatus || '')) {
        finalEstado = 'Pago fallido';
      } else {
        finalEstado = undefined; // PENDING or other intermediate states
      }
      if (DEBUG) console.log('[exito] wompi response', { status: wompiStatus, amount: wompiAmount, currency: wompiCurrency, reference: wompiReference, finalEstado });
    } catch (e: any) {
      error = e?.message || 'No se pudo verificar el pago';
      if (DEBUG) console.error('[exito] wompi verify error', error);
    }
  }

  // Update Airtable estado if we have a pedidoId and a resolved estado
  if (pedidoId && finalEstado) {
    try {
      const fields: Record<string, any> = { Estado: finalEstado };
      if (wompiId) fields['Wompi: Transacción ID'] = wompiId;
      if (wompiStatus) fields['Wompi: Estado'] = wompiStatus;
      if (wompiReference) fields['Wompi: Referencia'] = wompiReference;
      if (typeof wompiAmount === 'number' && Number.isFinite(wompiAmount)) fields['Wompi: Monto (centavos)'] = wompiAmount;
      if (wompiCurrency) fields['Wompi: Moneda'] = wompiCurrency;
      let ts: string | undefined;
      if (finalEstado === 'Pagado') {
        ts = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
        fields['Fecha de pagado'] = ts;
        if (DEBUG) console.log('[exito] fecha_de_pagado', ts);
      }
      if (DEBUG) console.log('[exito] updating Airtable', { table: PEDIDO_TABLE, pedidoId, fields: Object.keys(fields) });
      try {
        const rec = await base(PEDIDO_TABLE).update(pedidoId, fields);
        if (DEBUG) console.log('[exito] airtable updated', { id: rec?.id || null, table: PEDIDO_TABLE });
      } catch (e: any) {
        const msg = String(e?.message || e || '');
        if (DEBUG) console.error('[exito] airtable update failed (first try)', msg);
        // Retry without optional numeric/currency fields that may be formulas or incompatible types
        const retryFields = { ...fields };
        delete retryFields['Wompi: Monto (centavos)'];
        delete retryFields['Wompi: Moneda'];
        // If fecha de pagado might be date-only field, try YYYY-MM-DD
        if (ts && /Fecha de pagado/.test(msg)) {
          retryFields['Fecha de pagado'] = ts.slice(0, 10);
          if (DEBUG) console.log('[exito] retrying with date-only for Fecha de pagado', retryFields['Fecha de pagado']);
        } else if (!ts) {
          delete (retryFields as any)['Fecha de pagado'];
        }
        if (DEBUG) console.log('[exito] retrying update without amount/currency');
        const rec2 = await base(PEDIDO_TABLE).update(pedidoId, retryFields);
        if (DEBUG) console.log('[exito] airtable updated (retry)', { id: rec2?.id || null, table: PEDIDO_TABLE });
      }
    } catch (e) {
      // Swallow errors; show UI message only
      if (DEBUG) console.error('[exito] airtable update failed', (e as any)?.message || e);
    }
  }

  return {
    pedidoId,
    wompiId,
    wompiStatus,
    estado: finalEstado,
    wompiAmount,
    wompiCurrency,
    wompiReference,
    error,
  };
};
