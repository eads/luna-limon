<!-- Calendario showcase -->
<script lang="ts">
  type Product = {
    id: string;
    nombre: { es?: string; en?: string };
    descripción: { es?: string; en?: string };
    precio: number;
    imagen?: string;
  };
  import { cart } from '$lib/cart';
  import { useI18n } from '$lib/i18n/context';
  const { t } = useI18n();
  const tf = (k: string, f: string) => { const v = t(k); return v === k ? f : v; };
  import { getResizedImageUrl } from '$lib/utils/images';
  // @ts-expect-error - runtime types not generated yet
  import { getLocale } from '$lib/paraglide/runtime.js';
  const nameOf = (p: Product) => p.nombre[getLocale() as 'es'|'en'] ?? p.nombre.es ?? p.nombre.en ?? '';
  const descOf = (p: Product) => p.descripción[getLocale() as 'es'|'en'] ?? p.descripción.es ?? p.descripción.en ?? '';

  let { data } = $props<{ data: { products: Product[] } }>();
  const calendar = $derived(data.products?.[0]);
  let qty = $state(1);
  let flash = $state(false);
  let scrollY = $state(0);
  let raf = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      scrollY = window.scrollY || 0;
      raf = 0;
    });
  }
  import { onMount, onDestroy } from 'svelte';
  onMount(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
  });
  onDestroy(() => window.removeEventListener('scroll', onScroll));
  const y = (speed: number) => `transform: translateY(${Math.round(scrollY * speed)}px); will-change: transform;`;

  function addNow() {
    if (!calendar) return;
    cart.add(calendar, qty || 1);
    flash = true; setTimeout(() => flash = false, 700);
  }
</script>

<style>
  /* Full-bleed section helper */
  .full-bleed {
    position: relative;
    left: 50%;
    right: 50%;
    margin-left: -50vw;
    margin-right: -50vw;
    width: 100vw;
  }
  .content-wrap {
    max-width: 72rem; /* ~lg container */
    margin-left: auto;
    margin-right: auto;
    padding-left: 1rem;
    padding-right: 1rem;
  }
  @media (min-width: 768px) {
    .content-wrap { padding-left: 2rem; padding-right: 2rem; }
  }
</style>

{#if !calendar}
  <p class="text-gray-500">{tf('calendario.vacio', 'No hay productos de calendario.')}</p>
{:else}
  <!-- Full-bleed hero: stacked with centered imagery -->
  <section class="full-bleed relative overflow-hidden mb-10">
    <div class="absolute inset-0 -z-10" style="background-image:url('/images/cal_hero.svg'); background-size:cover; background-position:center;"></div>
    <div class="content-wrap py-10 md:py-20">
      <div class="text-center">
        <h1 class="text-5xl md:text-7xl font-extrabold leading-tight mb-4" style={y(-0.05)}>{tf('calendario.hero_title','Un calendario para saborear el año')}</h1>
        <p class="text-base md:text-xl text-gray-700/90 mb-6 max-w-2xl mx-auto" style={y(-0.03)}>{tf('calendario.hero_subtitle','12 ilustraciones, recetas y momentos para reunirnos')}</p>
        <div class="flex items-center justify-center gap-3 mb-6" style={y(-0.02)}>
          <div class="flex items-center rounded-full overflow-hidden bg-white/80 backdrop-blur border">
            <button class="px-3 py-2" onclick={() => qty = Math.max(1, qty - 1)}>-</button>
            <input class="w-16 text-center py-2 bg-transparent" type="number" min="1" bind:value={qty} />
            <button class="px-3 py-2" onclick={() => qty = qty + 1}>+</button>
          </div>
          <button class={`rounded-full bg-black text-white py-2 px-6 ${flash ? 'ring-4 ring-amber-300/40' : ''}`} onclick={addNow}>
            {tf('calendario.buy','Comprar calendario')} — ${calendar.precio}
          </button>
        </div>
      </div>
      <div class="relative">
        <div class="rounded-xl shadow-xl overflow-hidden mx-auto max-w-3xl" style={y(-0.12)}>
          <img src={calendar.imagen ? getResizedImageUrl(calendar.imagen, 1200) : '/images/cal_hero.svg'} alt={nameOf(calendar)} class="w-full" />
        </div>
      </div>
    </div>
  </section>

  <!-- Full-bleed feature panels, text above centered image -->
  <section class="space-y-8">
    <!-- Panel 1 -->
    <div class="full-bleed bg-[url('/images/cal_f1.svg')] bg-cover bg-center py-10 md:py-16">
      <div class="content-wrap">
        <div class="text-center mb-6">
          <h2 class="text-3xl md:text-5xl font-semibold mb-2" style={y(-0.05)}>{tf('calendario.f1_title','Arte que inspira cada mes')}</h2>
          <p class="text-gray-700 md:text-lg max-w-2xl mx-auto" style={y(-0.03)}>{tf('calendario.f1_body','Ilustraciones originales impresas con tintas de alta calidad.')}</p>
        </div>
        <div class="rounded-xl overflow-hidden mx-auto max-w-2xl" style={y(-0.08)}>
          <img src={'/images/cal_f1.svg'} alt={nameOf(calendar)} class="w-full" />
        </div>
      </div>
    </div>

    <!-- Panel 2 -->
    <div class="full-bleed bg-[url('/images/cal_f2.svg')] bg-cover bg-center py-10 md:py-16">
      <div class="content-wrap">
        <div class="text-center mb-6">
          <h2 class="text-3xl md:text-5xl font-semibold mb-2" style={y(-0.05)}>{tf('calendario.f2_title','Recetas estacionales')}</h2>
          <p class="text-gray-700 md:text-lg max-w-2xl mx-auto" style={y(-0.03)}>{tf('calendario.f2_body','Ideas sencillas y deliciosas para compartir en casa.')}</p>
        </div>
        <div class="rounded-xl overflow-hidden mx-auto max-w-2xl" style={y(-0.06)}>
          <img src={'/images/cal_f2.svg'} alt={nameOf(calendar)} class="w-full" />
        </div>
      </div>
    </div>

    <!-- Panel 3 -->
    <div class="full-bleed bg-[url('/images/cal_f3.svg')] bg-cover bg-center py-10 md:py-16">
      <div class="content-wrap">
        <div class="text-center mb-6">
          <h2 class="text-3xl md:text-5xl font-semibold mb-2" style={y(-0.05)}>{tf('calendario.f3_title','Papel sustentable')}</h2>
          <p class="text-gray-700 md:text-lg max-w-2xl mx-auto" style={y(-0.03)}>{tf('calendario.f3_body','Hecho con materiales responsables con el planeta.')}</p>
        </div>
        <div class="rounded-xl overflow-hidden mx-auto max-w-2xl" style={y(-0.05)}>
          <img src={'/images/cal_f3.svg'} alt={nameOf(calendar)} class="w-full" />
        </div>
      </div>
    </div>

    <!-- Panel 4 -->
    <div class="full-bleed bg-[url('/images/cal_f4.svg')] bg-cover bg-center py-10 md:py-16">
      <div class="content-wrap">
        <div class="text-center mb-6">
          <h2 class="text-3xl md:text-5xl font-semibold mb-2" style={y(-0.05)}>{tf('calendario.f4_title','Listo para regalar')}</h2>
          <p class="text-gray-700 md:text-lg max-w-2xl mx-auto" style={y(-0.03)}>{tf('calendario.f4_body','Empaque hermoso para que llegue con cariño.')}</p>
        </div>
        <div class="rounded-xl overflow-hidden mx-auto max-w-2xl" style={y(-0.04)}>
          <img src={'/images/cal_f4.svg'} alt={nameOf(calendar)} class="w-full" />
        </div>
      </div>
    </div>
  </section>

  <!-- Sticky buy bar -->
  <div class="fixed bottom-4 inset-x-0 flex justify-center pointer-events-none">
    <div class="pointer-events-auto bg-white/80 backdrop-blur rounded-full shadow-xl px-4 py-2 flex items-center gap-3">
      <span class="font-medium hidden sm:inline">{nameOf(calendar)}</span>
      <div class="flex items-center border rounded overflow-hidden">
        <button class="px-3 py-1" onclick={() => qty = Math.max(1, qty - 1)}>-</button>
        <input class="w-12 text-center py-1" type="number" min="1" bind:value={qty} />
        <button class="px-3 py-1" onclick={() => qty = qty + 1}>+</button>
      </div>
      <button class={`rounded-full bg-black text-white py-1.5 px-4 ${flash ? 'ring-4 ring-amber-300/40' : ''}`} onclick={addNow}>
        {tf('calendario.buy','Comprar calendario')} — ${calendar.precio}
      </button>
    </div>
  </div>
{/if}
