<script lang="ts">
import { cart, type Product as CartProduct } from '$lib/cart';
import { goto } from '$app/navigation';
import { useI18n } from '$lib/i18n/context';
import Icon from '@iconify/svelte';
import whatsappIcon from '@iconify-icons/mdi/whatsapp';
const { t } = useI18n();
// locale-based selectors for product fields
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
    const cal = data?.calendar;
    // To avoid hydration mismatch on the calendar item, always prefer
    // the server-provided calendar image when ids match.
    if (cal && p?.id === cal.id) {
      return imageOf({ imagen: cal.imagen });
    }
    const u = imageOf(p);
    if (u) return u;
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
  // Additional address fields for shipping quotes
  let ciudad = $state('');
  let departamento = $state('');
  let codigo_postal = $state('');
  let notas_cliente = $state('');

  let submitting = $state(false);
  let errorMsg = $state('');
  let submitAttempted = $state(false);

  // Local storage persistence (best-effort; browser-only)
  const LS_KEY = 'checkout_info_v1';
  function loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw || '{}');
      if (obj.nombre) nombre = obj.nombre;
      if (obj.correo_electronico) correo_electronico = obj.correo_electronico;
      if (obj.numero_whatsapp) numero_whatsapp = obj.numero_whatsapp;
      if (obj.direccion_envio) direccion_envio = obj.direccion_envio;
      // Do not restore delivery date to avoid accidental reuse
      if (obj.notas_cliente) notas_cliente = obj.notas_cliente;
    } catch {}
  }
  function persistToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const obj = {
        nombre,
        correo_electronico,
        numero_whatsapp,
        direccion_envio,
        // Do not persist delivery date to encourage fresh intent each time
        notas_cliente
      };
      localStorage.setItem(LS_KEY, JSON.stringify(obj));
    } catch {}
  }
  // load once
  if (typeof window !== 'undefined') {
    loadFromStorage();
  }

  // Validation helpers
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  function isValidEmail(v: string) { return emailRe.test((v || '').trim()); }
  function normalizePhoneCO(v: string) {
    const digits = (v || '').replace(/\D+/g, '');
    if (digits.startsWith('57')) return `+${digits}`; // already has country code
    if (digits.length === 10) return `+57${digits}`; // local mobile format
    if (digits.length === 12 && digits.startsWith('57')) return `+${digits}`;
    return v.trim();
  }
  function isValidPhoneCO(v: string) {
    const d = (v || '').replace(/\D+/g, '');
    if (d.startsWith('57') && d.length === 12) return true; // 57 + 10
    if (d.length === 10) return true;
    return false;
  }
  function minDeliveryDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const isNonEmpty = (s: string) => (s || '').trim().length > 0;
  function validateAll() {
    const okNombre = isNonEmpty(nombre);
    const okEmail = isValidEmail(correo_electronico);
    const okPhone = isValidPhoneCO(numero_whatsapp);
    const okDir = true;
    const okCiudad = isNonEmpty(ciudad);
    const okDepto = isNonEmpty(departamento);
    return { okNombre, okEmail, okPhone, okCiudad, okDepto, all: okNombre && okEmail && okPhone && okCiudad && okDepto };
  }
  function scrollToFirstInvalid() {
    const v = validateAll();
    const order = [
      ['nombre', v.okNombre],
      ['correo', v.okEmail],
      ['whatsapp', v.okPhone],
      ['ciudad', v.okCiudad],
      ['departamento', v.okDepto]
    ] as const;
    for (const [id, ok] of order) {
      if (!ok) {
        const el = document.getElementById(`fld-${id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (el as HTMLInputElement | HTMLTextAreaElement).focus();
        }
        break;
      }
    }
  }
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
    if ($cart.length === 0 || submitting) return;
    submitAttempted = true;
    const v = validateAll();
    if (!v.all) {
      scrollToFirstInvalid();
      return;
    }
    submitting = true;
    errorMsg = '';
    try {
      // Normalize phone before sending
      const phoneNormalized = normalizePhoneCO(numero_whatsapp);
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nombre,
          correo_electronico,
          direccion_envio,
          ciudad,
          departamento,
          codigo_postal,
          notas_cliente,
          phone: phoneNormalized,
          items: $cart,
        }),
      });
      if (!res.ok) {
        let detail = '';
        try { const j = await res.json(); detail = j?.message || j?.detail || ''; } catch {}
        throw new Error(detail || `Error ${res.status}`);
      }
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        const id = data.pedidoId ? `?pedido-id=${encodeURIComponent(data.pedidoId)}` : '';
        goto(`/pagar/exito${id}`);
      }
    } catch (err) {
      // Flag the error; the rendered message uses t('pagar.error')
      errorMsg = (err as any)?.message || 'error';
    } finally {
      submitting = false;
    }
  }
</script>

  <div class="max-w-md mx-auto pt-6 px-4 md:px-0 pb-16">
<h1 class="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">{t('pagar.titulo')}</h1>

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
              <div class="text-sm sm:text-base text-gray-900 font-semibold max-w-full pb-4 whitespace-normal break-words leading-snug text-right">{displayName(product)}</div>
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
        <div class="text-sm text-gray-700">{t('pagar.total')}</div>
        <div class="font-semibold text-gray-900 text-2xl">{fmtCOP.format(total)}</div>
      </div>
    </section>
  </div>
{/if}

{#if !$cart.length}
  <div class="mt-4 p-3 text-center text-gray-700 bg-white/70 border rounded-lg">{t('carrito.vacio')}</div>
{/if}

  <div class="grid gap-3 mb-5" class:opacity-60={!$cart.length}>
  <label class="block">
    <span class="text-base text-gray-800">{t('pagar.nombre')}</span>
    <input id="fld-nombre" name="name" autocomplete="name" class="mt-1 w-full rounded-xl border p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" class:border-red-500={submitAttempted && !validateAll().okNombre} bind:value={nombre} placeholder={t('pagar.placeholder.nombre')} disabled={!$cart.length} oninput={persistToStorage} />
    {#if submitAttempted && !validateAll().okNombre}
      <p class="text-sm text-red-600 mt-1">{t('pagar.validacion.requerido')}</p>
    {/if}
  </label>

  <label class="block">
    <span class="text-base text-gray-800">{t('pagar.correo')}</span>
    <input id="fld-correo" name="email" autocomplete="email" class="mt-1 w-full rounded-xl border p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" class:border-red-500={submitAttempted && !validateAll().okEmail} type="email" bind:value={correo_electronico} placeholder={t('pagar.placeholder.correo')} disabled={!$cart.length} oninput={persistToStorage} />
    {#if submitAttempted && !validateAll().okEmail}
      <p class="text-sm text-red-600 mt-1">{t('pagar.validacion.correo_invalido')}</p>
    {/if}
  </label>

  <label class="block">
    <span class="flex items-center gap-2 text-base text-gray-800">
      <Icon icon={whatsappIcon} class="h-5 w-5 text-emerald-500" aria-hidden="true" />
      {t('pagar.whatsapp')}
    </span>
    <input id="fld-whatsapp" name="tel" type="tel" inputmode="numeric" autocomplete="tel" class="mt-1 w-full rounded-xl border p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" class:border-red-500={submitAttempted && !validateAll().okPhone} bind:value={numero_whatsapp} placeholder={t('pagar.placeholder.whatsapp')} disabled={!$cart.length} onblur={() => { numero_whatsapp = normalizePhoneCO(numero_whatsapp); persistToStorage(); }} oninput={persistToStorage} />
    {#if submitAttempted && !validateAll().okPhone}
      <p class="text-sm text-red-600 mt-1">{t('pagar.validacion.telefono_invalido')}</p>
    {/if}
  </label>

  <!-- Address textarea temporarily removed during pre-order period -->

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <label class="block">
      <span class="text-base text-gray-800">{t('pagar.ciudad')}</span>
      <input id="fld-ciudad" class="mt-1 w-full rounded-xl border p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" class:border-red-500={submitAttempted && !validateAll().okCiudad} bind:value={ciudad} placeholder={t('pagar.placeholder.ciudad')} disabled={!$cart.length} oninput={persistToStorage} />
      {#if submitAttempted && !validateAll().okCiudad}
        <p class="text-sm text-red-600 mt-1">{t('pagar.validacion.requerido')}</p>
      {/if}
    </label>
    <label class="block">
      <span class="text-base text-gray-800">{t('pagar.departamento')}</span>
      <input id="fld-departamento" class="mt-1 w-full rounded-xl border p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" class:border-red-500={submitAttempted && !validateAll().okDepto} bind:value={departamento} placeholder={t('pagar.placeholder.departamento')} disabled={!$cart.length} oninput={persistToStorage} />
      {#if submitAttempted && !validateAll().okDepto}
        <p class="text-sm text-red-600 mt-1">{t('pagar.validacion.requerido')}</p>
      {/if}
    </label>
  </div>
  <label class="block">
    <span class="text-base text-gray-800">{t('pagar.codigo_postal')}</span>
    <input id="fld-codpostal" class="mt-1 w-full rounded-xl border p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" bind:value={codigo_postal} placeholder={t('pagar.placeholder.codigo_postal')} disabled={!$cart.length} oninput={persistToStorage} />
  </label>

  <label class="block">
    <span class="text-base text-gray-800">{t('pagar.notas')}</span>
    <textarea name="notes" autocomplete="off" class="mt-1 w-full rounded-xl border border-gray-400 p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" rows="3" bind:value={notas_cliente} placeholder={t('pagar.placeholder.notas')} disabled={!$cart.length}></textarea>
  </label>
  {#if errorMsg}
    <p class="text-red-600 mb-1 text-sm">{t('pagar.error')}: {errorMsg}</p>
  {/if}
</div>

<button
  class="w-full rounded-lg bg-emerald-600 disabled:bg-emerald-300 text-white py-3 px-4 shadow-sm"
  onclick={placeOrder}
  disabled={submitting || $cart.length === 0}
>
  {submitting ? t('pagar.procesando') : t('pagar.realizar_pedido')}
</button>

</div>
