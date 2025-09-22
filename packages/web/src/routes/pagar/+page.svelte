<script lang="ts">
  import { cart, type Product as CartProduct } from '$lib/cart';
  import { goto } from '$app/navigation';
  import { useI18n } from '$lib/i18n/context';
  const { t } = useI18n();
  // locale-based selectors for product fields
  // @ts-expect-error - runtime types not generated yet
  import { getLocale } from '$lib/paraglide/runtime.js';
  const nameOf = (p: CartProduct) => {
    const n: any = (p as any)?.nombre;
    if (!n) return '';
    if (typeof n === 'string') return n;
    const loc = getLocale() as 'es' | 'en';
    return n[loc] ?? n.es ?? n.en ?? '';
  };
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
  // Prefer a robust image getter that falls back to server-provided calendar image
  function imageFor(p: any): string {
    const u = imageOf(p);
    if (u) return u;
    const cal = data?.calendar;
    if (cal && p?.id === cal.id) {
      return imageOf({ imagen: cal.imagen });
    }
    return '';
  }
  // Prefer server-provided calendar name to avoid stale localStorage cart names
  function displayName(p: CartProduct): string {
    const cal = data?.calendar;
    if (cal && p?.id === cal.id) return cal.nombre;
    return nameOf(p);
  }
  type SrvProduct = { id: string; nombre: string; descripción: string; precio: number; imagen?: any };
  let { data } = $props<{ data: { calendar?: SrvProduct } }>();
  // No fallbacks: all strings must exist in the DB
  
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
  const calendarAsCart = $derived(data.calendar ? ({
    id: data.calendar.id,
    nombre: { es: data.calendar.nombre, en: data.calendar.nombre },
    descripción: { es: data.calendar.descripción, en: data.calendar.descripción },
    precio: data.calendar.precio,
    imagen: data.calendar.imagen
  } satisfies CartProduct) : null);
  const renderItems = $derived(items.length ? items : (calendarAsCart ? [{ product: calendarAsCart, quantity: 0 }] : []));
  const total = $derived(items.reduce((sum, i) => sum + i.product.precio * i.quantity, 0));
  // No auto-add; we show a zero-qty preview when cart is empty

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
      // Flag the error; the rendered message uses t('checkout.error')
      errorMsg = 'error';
    } finally {
      submitting = false;
    }
  }
</script>

  <div class="max-w-md mx-auto pt-6">
<h1 class="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">{t('carrito.checkout.title')}</h1>

{#if renderItems.length}
  <!-- Order summary first with warm backdrop and fewer lines -->
  <div class="u-full-bleed mb-8" style="background-color:#edeae6; box-shadow: inset 0 -10px 14px -12px rgba(0,0,0,0.2);">
    <section class="mx-auto max-w-lg px-4 pt-8 pb-6">
      <ul class="space-y-3">
        {#each renderItems as { product } (product.id)}
          <li class="flex items-center gap-2 sm:gap-3 w-full">
            <!-- Image only; proportional container with generous max-width -->
            <div class="flex-1 min-w-0 max-w-[30rem] sm:max-w-[38rem] flex flex-col items-start">
              {#if imageFor(product)}
                <div class="relative w-full aspect-[5/3]">
                  <img
                    src={getResizedImageUrl(imageFor(product), 600)}
                    alt={nameOf(product)}
                    class="absolute inset-0 w-full h-full object-cover rounded-xl"
                    loading="lazy"
                  />
                </div>
              {/if}
            </div>
            <!-- Qty + price (fixed width) -->
            <div class="pl-2 sm:pl-3 text-right flex flex-col items-end shrink-0 ml-auto" style="width: clamp(9.75rem, 34vw, 12.5rem);">
              <!-- Item title above controls -->
              <div class="text-sm sm:text-base text-gray-900 font-semibold max-w-full pb-1 whitespace-normal break-words leading-snug text-right">{displayName(product)}</div>
              <div class="flex items-center gap-2 mb-1">
                <button
                  class="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gray-100 hover:bg-gray-200 text-xl leading-none"
                  aria-label="Restar"
                  onclick={() => {
                    const current = $cart.find((i) => i.product.id === product.id)?.quantity ?? 0;
                    cart.setQuantity(product.id, Math.max(0, current - 1));
                  }}
                >-</button>
                <span class="min-w-[2.25rem] text-xl sm:text-2xl font-bold text-gray-900 text-center">{$cart.find((i) => i.product.id === product.id)?.quantity ?? 0}</span>
                <button
                  class="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gray-100 hover:bg-gray-200 text-xl leading-none"
                  aria-label="Sumar"
                  onclick={() => {
                    const current = $cart.find((i) => i.product.id === product.id)?.quantity ?? 0;
                    if (current === 0) {
                      cart.add(product, 1);
                    } else {
                      cart.setQuantity(product.id, current + 1);
                    }
                  }}
                >+</button>
              </div>
              <!-- Per-item pricing removed; overall total is shown below -->
            </div>
          </li>
        {/each}
      </ul>
      <div class="mt-2 pt-3 border-t border-gray-200 text-right">
        <div class="text-sm text-gray-700">{t('carrito.checkout.total')}</div>
        <div class="font-semibold text-gray-900 text-2xl">{fmtCOP.format(total)}</div>
      </div>
    </section>
  </div>
{/if}

{#if !$cart.length}
  <div class="mt-4 p-3 text-center text-gray-700 bg-white/70 border rounded-lg">{t('carrito_vacio')}</div>
{/if}

  <div class="grid gap-3 mb-5" class:opacity-60={!$cart.length}>
  <label class="block">
    <span class="text-base text-gray-800">{t('carrito.checkout.name')}</span>
    <input class="mt-1 w-full rounded-xl border border-gray-400 p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" bind:value={nombre} disabled={!$cart.length} />
  </label>

  <label class="block">
    <span class="text-base text-gray-800">{t('carrito.checkout.email')}</span>
    <input class="mt-1 w-full rounded-xl border border-gray-400 p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" type="email" bind:value={correo_electronico} disabled={!$cart.length} />
  </label>

  <label class="block">
    <span class="text-base text-gray-800">{t('carrito.checkout.whatsapp')}</span>
    <input class="mt-1 w-full rounded-xl border border-gray-400 p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" bind:value={numero_whatsapp} disabled={!$cart.length} />
  </label>

  <label class="block">
    <span class="text-base text-gray-800">{t('carrito.checkout.address')}</span>
    <textarea class="mt-1 w-full rounded-xl border border-gray-400 p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" rows="3" bind:value={direccion_envio} disabled={!$cart.length}></textarea>
  </label>

  <label class="block">
    <span class="text-base text-gray-800">{t('carrito.checkout.delivery_date')}</span>
    <input class="mt-1 w-full rounded-xl border border-gray-400 p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" type="date" bind:value={fecha_entrega} disabled={!$cart.length} />
  </label>

  <label class="block">
    <span class="text-base text-gray-800">{t('carrito.checkout.notes')}</span>
    <textarea class="mt-1 w-full rounded-xl border border-gray-400 p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" rows="3" bind:value={notas_cliente} disabled={!$cart.length}></textarea>
  </label>
  {#if errorMsg}
    <p class="text-red-600 mb-1 text-sm">{t('carrito.checkout.error')}</p>
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
  {submitting ? t('carrito.checkout.processing') : t('carrito.checkout.place_order')}
</button>

</div>
