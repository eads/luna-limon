<script lang="ts">
  import { cart, type Product as CartProduct } from '$lib/cart';
  import { goto } from '$app/navigation';
  import { useI18n } from '$lib/i18n/context';
  const { t } = useI18n();
  // locale-based selectors for product fields
  // @ts-expect-error - runtime types not generated yet
  import { getLocale } from '$lib/paraglide/runtime.js';
  const nameOf = (p: CartProduct) => p.nombre[getLocale() as 'es'|'en'] ?? p.nombre.es ?? p.nombre.en ?? '';
  const imageOf = (p: any): string => {
    const raw = p?.imagen;
    if (!raw) return '';
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw) && raw.length) {
      const first = raw[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object') {
        // Airtable attachment object shapes
        const obj = first as any;
        if (obj.url) return obj.url as string;
        if (obj.thumbnails?.large?.url) return obj.thumbnails.large.url as string;
        if (obj.thumbnails?.full?.url) return obj.thumbnails.full.url as string;
      }
    }
    if (raw && typeof raw === 'object' && 'url' in raw) return raw.url as string;
    return '';
  };
  import { getResizedImageUrl } from '$lib/utils/images';
  type SrvProduct = { id: string; nombre: string; descripción: string; precio: number; imagen?: string };
  let { data } = $props<{ data: { calendar?: SrvProduct } }>();
  // translation with fallback helper
  const tf = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };
  
  // Currency formatter for Colombian pesos
  const fmtCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });

  // Customer fields
  let nombre = $state('');
  let correo_electronico = $state('');
  let numero_whatsapp = $state('');
  let direccion_envio = $state('');
  let fecha_entrega = $state(''); // YYYY-MM-DD
  let notas_cliente = $state('');

  let submitting = $state(false);
  let errorMsg = $state('');
  const items = $derived($cart as unknown as { product: CartProduct; quantity: number }[]);
  const total = $derived(items.reduce((sum, i) => sum + i.product.precio * i.quantity, 0));
  import { onMount } from 'svelte';
  onMount(() => {
    if ($cart.length === 0 && data?.calendar) {
      const c = data.calendar;
      const adapted: CartProduct = {
        id: c.id,
        nombre: { es: c.nombre, en: c.nombre },
        descripción: { es: c.descripción, en: c.descripción },
        precio: c.precio,
        imagen: c.imagen
      };
      cart.add(adapted, 1);
    }
  });

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

<div class="max-w-md mx-auto pt-6">
<h1 class="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">{tf('checkout.title', 'Finalizar pedido')}</h1>

{#if items.length}
  <!-- Order summary first with warm backdrop and fewer lines -->
  <style>
    .full-bleed { position: relative; left: 50%; right: 50%; margin-left: -50vw; margin-right: -50vw; width: 100vw; }
  </style>
  <div class="full-bleed mb-8" style="background-color:#edeae6; box-shadow: inset 0 -10px 14px -12px rgba(0,0,0,0.2);">
    <section class="mx-auto max-w-md px-4 pt-8 pb-6">
      <ul class="space-y-3">
        {#each items as { product, quantity } (product.id)}
          <li class="flex items-center justify-between gap-3">
            <div class="flex flex-col items-start gap-2 flex-1 pr-2 min-w-0">
              {#if imageOf(product)}
                <img
                  src={getResizedImageUrl(imageOf(product), 600)}
                  alt={nameOf(product)}
                  class="w-40 h-24 rounded-xl object-cover flex-shrink-0"
                  loading="lazy"
                />
              {/if}
              <span class="text-xs text-gray-600 truncate">{nameOf(product)}</span>
            </div>
            <div class="pl-3 text-right flex flex-col items-end min-w-[9.5rem]">
              <div class="flex items-center gap-2 mb-1">
                <button
                  class="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-xl leading-none"
                  aria-label="Restar"
                  onclick={() => {
                    const current = $cart.find((i) => i.product.id === product.id)?.quantity ?? quantity;
                    cart.setQuantity(product.id, Math.max(1, current - 1));
                  }}
                >-</button>
                <span class="min-w-[2rem] text-xl font-semibold text-gray-900 text-center">{quantity}</span>
                <button
                  class="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-xl leading-none"
                  aria-label="Sumar"
                  onclick={() => {
                    const current = $cart.find((i) => i.product.id === product.id)?.quantity ?? quantity;
                    cart.setQuantity(product.id, current + 1);
                  }}
                >+</button>
              </div>
              <div class="text-base text-gray-800">
                <span class="text-gray-900 font-medium">{quantity}</span>
                × {fmtCOP.format(product.precio)}
                = <span class="text-gray-900 font-semibold">{fmtCOP.format(product.precio * quantity)}</span>
              </div>
            </div>
          </li>
        {/each}
      </ul>
      <div class="mt-4 text-right">
        <div class="text-sm text-gray-700">{tf('checkout.total', 'Total')}</div>
        <div class="font-semibold text-gray-900 text-2xl">{fmtCOP.format(total)}</div>
      </div>
    </section>
  </div>
{/if}

{#if !items.length}
  <div class="mt-6 p-6 text-center text-gray-700 bg-white border rounded-xl">
    <p class="mb-3">{t('carrito_vacio') || 'Tu carrito está vacío'}</p>
    <a href="/" class="inline-block rounded-full bg-emerald-600 text-white px-5 py-2">{t('volver_catalogo') || 'Volver al catálogo'}</a>
  </div>
{:else}
<div class="grid gap-3 mb-5">
  <label class="block">
    <span class="text-base text-gray-800">{tf('checkout.name', 'Nombre')}</span>
    <input class="mt-1 w-full rounded-xl border border-gray-400 p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" bind:value={nombre} placeholder="Tu nombre" />
  </label>

  <label class="block">
    <span class="text-base text-gray-800">{tf('checkout.email', 'Correo electrónico')}</span>
    <input class="mt-1 w-full rounded-xl border border-gray-400 p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" type="email" bind:value={correo_electronico} placeholder="tu@correo.com" />
  </label>

  <label class="block">
    <span class="text-base text-gray-800">{tf('checkout.whatsapp', 'Número de WhatsApp')}</span>
    <input class="mt-1 w-full rounded-xl border border-gray-400 p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" bind:value={numero_whatsapp} placeholder="Ej. +57 300 123 4567" />
  </label>

  <label class="block">
    <span class="text-base text-gray-800">{tf('checkout.address', 'Dirección de envío')}</span>
    <textarea class="mt-1 w-full rounded-xl border border-gray-400 p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" rows="3" bind:value={direccion_envio} placeholder="Dirección completa, barrio, ciudad, CP"></textarea>
  </label>

  <label class="block">
    <span class="text-base text-gray-800">{tf('checkout.delivery_date', 'Fecha de entrega')}</span>
    <input class="mt-1 w-full rounded-xl border border-gray-400 p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" type="date" bind:value={fecha_entrega} />
  </label>

  <label class="block">
    <span class="text-base text-gray-800">{tf('checkout.notes', 'Notas para tu pedido')}</span>
    <textarea class="mt-1 w-full rounded-xl border border-gray-400 p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" rows="3" bind:value={notas_cliente} placeholder="Instrucciones o comentarios"></textarea>
  </label>
  {#if errorMsg}
    <p class="text-red-600 mb-1 text-sm">{errorMsg}</p>
  {/if}
</div>

<!-- Payment method placeholder (WOMPI) -->
<section class="mb-5 border rounded-xl p-4 bg-white shadow-sm">
  <h2 class="font-semibold mb-2 text-gray-800">Pago</h2>
  <p class="text-sm text-gray-600">Integración con WOMPI próximamente.</p>
</section>

<button
  class="w-full rounded-lg bg-emerald-600 disabled:bg-emerald-300 text-white py-3 px-4 shadow-sm"
  onclick={placeOrder}
  disabled={submitting || $cart.length === 0}
>
  {submitting ? tf('checkout.processing', 'Procesando…') : tf('checkout.place_order', 'Realizar pedido')}
  {#if $cart.length > 0}
    <span class="ml-2 text-white/80 text-sm">({$cart.length} artículo{ $cart.length !== 1 ? 's' : '' })</span>
  {/if}
</button>
{/if}

</div>
