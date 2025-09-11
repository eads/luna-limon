<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useI18n } from '$lib/i18n/context';
  import { onMount } from 'svelte';
  import { cart } from '$lib/cart';
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => { const v = t(key); return v === key ? fallback : v; };
  const pedidoId = $derived(new URLSearchParams($page.url.search).get('pedidoId') || '');

  onMount(() => {
    // Clear cart on success page load
    cart.clear();
  });
</script>

<h1 class="text-2xl font-bold mb-2">{tf('success.title', '¡Gracias por tu pedido!')}</h1>
{#if pedidoId}
  <p class="mb-4">{tf('success.order_number', 'Tu número de pedido es:')} <span class="font-mono">{pedidoId}</span></p>
{/if}

<button class="rounded bg-green-600 text-white py-2 px-4" onclick={() => goto('/')}>{tf('success.back_to_catalog', 'Volver al catálogo')}</button>
