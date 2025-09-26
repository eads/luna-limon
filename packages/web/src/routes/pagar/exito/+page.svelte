<script lang="ts">
  export let data: {
    pedidoId?: string;
    wompiId?: string;
    wompiStatus?: string;
    estado?: 'Pagado' | 'Pago fallido';
    error?: string;
  };
</script>

<div class="max-w-md mx-auto pt-8">
  {#if data.estado === 'Pagado'}
    <h1 class="text-2xl font-bold text-emerald-700 mb-2">¡Pago aprobado!</h1>
    <p class="text-gray-800 mb-4">Gracias por tu compra. Tu pedido se registró correctamente.</p>
  {:else if data.estado === 'Pago fallido'}
    <h1 class="text-2xl font-bold text-red-700 mb-2">El pago no se completó</h1>
    <p class="text-gray-800 mb-4">Tu pedido quedó iniciado. Puedes intentarlo de nuevo.</p>
  {:else}
    <h1 class="text-2xl font-bold text-gray-800 mb-2">Estamos verificando tu pago…</h1>
    <p class="text-gray-700 mb-4">Un momento por favor.</p>
  {/if}

  <div class="mt-3 text-sm text-gray-600 space-y-1">
    {#if data.pedidoId}<div>Pedido: <code>{data.pedidoId}</code></div>{/if}
    {#if data.wompiId}<div>Transacción: <code>{data.wompiId}</code></div>{/if}
    {#if data.wompiStatus}<div>Estado Wompi: {data.wompiStatus}</div>{/if}
    {#if data.error}<div class="text-red-600">{data.error}</div>{/if}
  </div>
</div>

