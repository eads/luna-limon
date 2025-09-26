import type { PageServerLoad } from './$types';
import { base } from '$lib/server/airtable';

const PEDIDO_TABLE = process.env.AIRTABLE_PEDIDO_TABLE || process.env.AIRTABLE_ORDERS_TABLE || 'pedido';

export const load: PageServerLoad = async ({ url, fetch }) => {
  const pedidoId = url.searchParams.get('pedidoId') || '';
  const wompiId = url.searchParams.get('id') || '';

  const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY;
  const WOMPI_ENV = process.env.WOMPI_ENV; // optional override: 'test' | 'prod'

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
      const resp = await fetch(`${baseUrl}/v1/transactions/${encodeURIComponent(wompiId)}`, {
        headers: { Authorization: `Bearer ${WOMPI_PRIVATE_KEY}` },
      });
      if (!resp.ok) throw new Error(`Wompi status ${resp.status}`);
      const data = await resp.json();
      const tx = data?.data;
      wompiStatus = tx?.status;
      wompiAmount = typeof tx?.amount_in_cents === 'number' ? tx.amount_in_cents : undefined;
      wompiCurrency = tx?.currency;
      wompiReference = tx?.reference;
      finalEstado = wompiStatus === 'APPROVED' ? 'Pagado' : 'Pago fallido';
    } catch (e: any) {
      error = e?.message || 'No se pudo verificar el pago';
    }
  }

  // Update Airtable estado if we have a pedidoId and a resolved estado
  if (pedidoId && finalEstado) {
    try {
      const fields: Record<string, any> = { Estado: finalEstado };
      if (wompiId) fields['Wompi: Transacción ID'] = wompiId;
      if (wompiStatus) fields['Wompi: Estado'] = wompiStatus;
      if (wompiReference) fields['Wompi: Referencia'] = wompiReference;
      if (typeof wompiAmount === 'number') fields['Wompi: Monto (centavos)'] = wompiAmount;
      if (wompiCurrency) fields['Wompi: Moneda'] = wompiCurrency;
      if (finalEstado === 'Pagado') fields['Pagado en'] = new Date().toISOString();
      await base(PEDIDO_TABLE).update(pedidoId, fields);
    } catch (e) {
      // Swallow errors; show UI message only
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
