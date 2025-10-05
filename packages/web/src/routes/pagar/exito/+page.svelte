<script lang="ts">
  export let data: {
    pedidoId?: string;
    wompiId?: string;
    wompiStatus?: string;
    estado?: 'Pagado' | 'Pago fallido';
    error?: string;
  };
  import { onMount, onDestroy } from 'svelte';
  import { cart } from '$lib/cart';
  // Clear cart on success (client-side only)
  onMount(() => {
    if (data?.estado === 'Pagado') {
      cart.clear();
      try { localStorage.removeItem('checkout_info_v1'); } catch {}
    }
  });

  // Poll for final status if pending (no estado yet)
  let polling: any;
  onMount(() => {
    if (!data?.estado && data?.wompiId) {
      let attempts = 0;
      const maxAttempts = 60; // ~180s at 3s interval
      const tick = async () => {
        attempts += 1;
        try {
          const u = new URL('/pagar/exito/status', location.origin);
          if (data.pedidoId) u.searchParams.set('pedido-id', data.pedidoId);
          u.searchParams.set('id', data.wompiId!);
          const resp = await fetch(u, { headers: { 'cache-control': 'no-cache' } });
          if (resp.ok) {
            const j = await resp.json();
            if (j?.estado === 'Pagado' || j?.estado === 'Pago fallido') {
              data.estado = j.estado;
              data.wompiStatus = j.wompiStatus || j.wompi_status || data.wompiStatus;
              if (j.estado === 'Pagado') {
                cart.clear();
                try { localStorage.removeItem('checkout_info_v1'); } catch {}
              }
              clearInterval(polling);
            }
          }
        } catch {}
        if (attempts >= maxAttempts) clearInterval(polling);
      };
      polling = setInterval(tick, 3000);
      // immediate first tick
      tick();
    }
  });
  onDestroy(() => { if (polling) clearInterval(polling); });
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
