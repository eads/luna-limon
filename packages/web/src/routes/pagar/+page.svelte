<script lang="ts">
  import { cart, type Product } from '$lib/cart';
  import { goto } from '$app/navigation';
  import { useI18n } from '$lib/i18n/context';
  const { t } = useI18n();
  // locale-based selectors for product fields
  // @ts-expect-error - runtime types not generated yet
  import { getLocale } from '$lib/paraglide/runtime.js';
  const nameOf = (p: Product) => p.nombre[getLocale() as 'es'|'en'] ?? p.nombre.es ?? p.nombre.en ?? '';
  // translation with fallback helper
  const tf = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  // Customer fields
  let nombre = $state('');
  let correo_electronico = $state('');
  let numero_whatsapp = $state('');
  let direccion_envio = $state('');
  let fecha_entrega = $state(''); // YYYY-MM-DD
  let notas_cliente = $state('');

  let submitting = $state(false);
  let errorMsg = $state('');
  const items = $derived($cart);
  const total = $derived(items.reduce((sum, i) => sum + i.product.precio * i.quantity, 0));

  async function placeOrder() {
    if ($cart.length === 0) return;
    submitting = true;
    errorMsg = '';
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nombre,
          correo_electronico,
          direccion_envio,
          fecha_entrega: fecha_entrega || undefined,
          notas_cliente,
          phone: numero_whatsapp,
          items: $cart,
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        const id = data.pedidoId ? `?pedidoId=${encodeURIComponent(data.pedidoId)}` : '';
        goto(`/pagar/exito${id}`);
      }
    } catch (err) {
      errorMsg = tf('checkout.error', 'No se pudo procesar el pedido. Intente de nuevo.');
    } finally {
      submitting = false;
    }
  }
</script>

<h1 class="text-2xl font-bold mb-4">{tf('checkout.title', 'Finalizar pedido')}</h1>

<div class="grid gap-3 mb-4">
  <label class="block">
    <span class="text-sm text-gray-700">{tf('checkout.name', 'Nombre')}</span>
    <input class="mt-1 w-full rounded border p-2" bind:value={nombre} placeholder="Tu nombre" />
  </label>

  <label class="block">
    <span class="text-sm text-gray-700">{tf('checkout.email', 'Correo electrónico')}</span>
    <input class="mt-1 w-full rounded border p-2" type="email" bind:value={correo_electronico} placeholder="tu@correo.com" />
  </label>

  <label class="block">
    <span class="text-sm text-gray-700">{tf('checkout.whatsapp', 'Número de WhatsApp')}</span>
    <input class="mt-1 w-full rounded border p-2" bind:value={numero_whatsapp} placeholder="Ej. +52 55 1234 5678" />
  </label>

  <label class="block">
    <span class="text-sm text-gray-700">{tf('checkout.address', 'Dirección de envío')}</span>
    <textarea class="mt-1 w-full rounded border p-2" rows="3" bind:value={direccion_envio} placeholder="Calle, número, colonia, ciudad, CP"></textarea>
  </label>

  <label class="block">
    <span class="text-sm text-gray-700">{tf('checkout.delivery_date', 'Fecha de entrega')}</span>
    <input class="mt-1 w-full rounded border p-2" type="date" bind:value={fecha_entrega} />
  </label>

  <label class="block">
    <span class="text-sm text-gray-700">{tf('checkout.notes', 'Notas para tu pedido')}</span>
    <textarea class="mt-1 w-full rounded border p-2" rows="3" bind:value={notas_cliente} placeholder="Instrucciones o comentarios"></textarea>
  </label>
</div>

{#if errorMsg}
  <p class="text-red-600 mb-3 text-sm">{errorMsg}</p>
{/if}

<!-- Order summary -->
{#if items.length}
  <div class="mb-4 border rounded p-3 bg-white/70">
    <h2 class="font-semibold mb-2">{tf('checkout.summary', 'Resumen')}</h2>
    <ul class="space-y-1">
      {#each items as { product, quantity } (product.id)}
        <li class="flex justify-between text-sm">
          <span>{nameOf(product)} × {quantity}</span>
          <span>${product.precio * quantity}</span>
        </li>
      {/each}
    </ul>
    <p class="mt-2 font-semibold flex justify-between">
      <span>{tf('checkout.total', 'Total')}</span>
      <span>${total}</span>
    </p>
  </div>
{/if}

<button
  class="rounded bg-green-600 disabled:bg-green-300 text-white py-2 px-4"
  onclick={placeOrder}
  disabled={submitting || $cart.length === 0}
>
  {submitting ? tf('checkout.processing', 'Procesando…') : tf('checkout.place_order', 'Realizar pedido')}
  {#if $cart.length > 0}
    <span class="ml-2 text-white/80 text-sm">({$cart.length} artículo{ $cart.length !== 1 ? 's' : '' })</span>
  {/if}
</button>
