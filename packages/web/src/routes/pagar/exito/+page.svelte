<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useI18n } from '$lib/i18n/context';
  import { onMount } from 'svelte';
  import { cart } from '$lib/cart';
  const { t } = useI18n();
  const pedidoId = $derived(new URLSearchParams($page.url.search).get('pedidoId') || '');

  onMount(() => {
    // Clear cart on success page load
    cart.clear();
  });
</script>

<h1 class="text-2xl font-bold mb-2">{t('success.title')}</h1>
{#if pedidoId}
  <p class="mb-4">{t('success.order_number')} <span class="font-mono">{pedidoId}</span></p>
{/if}

<button class="rounded bg-green-600 text-white py-2 px-4" onclick={() => goto('/')}>{t('success.back_to_catalog')}</button>
