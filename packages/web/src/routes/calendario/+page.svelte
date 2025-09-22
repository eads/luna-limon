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
  import { getResizedImageUrl } from '$lib/utils/images';
  // @ts-expect-error - runtime types not generated yet
  import { getLocale, localizeHref } from '$lib/paraglide/runtime.js';
  import { goto } from '$app/navigation';
  const nameOf = (p: Product) => p.nombre[getLocale() as 'es'|'en'] ?? p.nombre.es ?? p.nombre.en ?? '';
  const descOf = (p: Product) => p.descripción[getLocale() as 'es'|'en'] ?? p.descripción.es ?? p.descripción.en ?? '';
  const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  let { data } = $props<{ data: { products: Product[] } }>();
  const calendar = $derived(data.products?.[0]);
  let qty = $state(1);
  let flash = $state(false);
  import { browser } from '$app/environment';
  let scrollY = $state(0);
  let raf = 0;
  let reducedMotion = $state(false);
  function onScroll() {
    if (!browser) return;
    if (raf) return;
    const rafFn = (cb: FrameRequestCallback) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(cb) : setTimeout(cb, 16) as unknown as number);
    raf = rafFn(() => {
      scrollY = (browser ? window.scrollY : 0) || 0;
      raf = 0;
    });
  }
  import { onMount, onDestroy } from 'svelte';
  onMount(() => {
    if (browser) {
      window.addEventListener('scroll', onScroll, { passive: true });
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      reducedMotion = !!mql.matches;
      const listener = () => { reducedMotion = !!mql.matches; };
      mql.addEventListener?.('change', listener);
    }
  });
  onDestroy(() => { if (browser) window.removeEventListener('scroll', onScroll); });
  const y = (speed: number) => reducedMotion ? '' : `transform: translateY(${Math.round(scrollY * speed)}px); will-change: transform;`;

  function addNow() {
    if (!calendar) return;
    cart.add(calendar, qty || 1);
    flash = true; setTimeout(() => flash = false, 700);
    goto(localizeHref('/pagar'));
  }

  // Foreground image fallback: try .png → .jpg → .svg
  function fgFallback(e: Event, base: string) {
    const img = e.currentTarget as HTMLImageElement;
    const src = img.getAttribute('src') || '';
    if (src.endsWith('.png')) {
      img.src = `/images/${base}.jpg`;
    } else {
      img.onerror = null;
      // Map cal_hero_fg -> cal_hero.svg, cal_fN_fg -> cal_fN.svg
      const svgBase = base.replace('_fg', '');
      img.src = `/images/${svgBase}.svg`;
    }
  }

  // Sticky buy bar visibility based on top CTA in-view
  let topCtaEl: HTMLElement | null = null;
  let topCtaInView = $state(true);
  const showSticky = $derived(!topCtaInView);
  onMount(() => {
    if (!browser || !topCtaEl || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      topCtaInView = !!entry?.isIntersecting;
    }, { threshold: 0.1 });
    io.observe(topCtaEl);
    return () => io.disconnect();
  });

  // Panel reveals
  let p1El: HTMLElement | null = null;
  let p2El: HTMLElement | null = null;
  let p3El: HTMLElement | null = null;
  let p4El: HTMLElement | null = null;
  let p1Shown = $state(false);
  let p2Shown = $state(false);
  let p3Shown = $state(false);
  let p4Shown = $state(false);
  onMount(() => {
    if (!browser) {
      p1Shown = p2Shown = p3Shown = p4Shown = true;
      return;
    }
    if (reducedMotion) {
      p1Shown = p2Shown = p3Shown = p4Shown = true;
      return;
    }
    const opts = { threshold: 0.15 };
    const mk = (setter: (v: boolean) => void) => new IntersectionObserver((entries, obs) => {
      const entry = entries[0];
      if (entry?.isIntersecting) {
        setter(true);
        obs.disconnect();
      }
    }, opts);
    if (p1El) mk((v)=> p1Shown = v).observe(p1El);
    if (p2El) mk((v)=> p2Shown = v).observe(p2El);
    if (p3El) mk((v)=> p3Shown = v).observe(p3El);
    if (p4El) mk((v)=> p4Shown = v).observe(p4El);
  });
</script>

<style>
  .reveal { opacity: 0; transform: translateY(12px); transition: opacity 400ms ease, transform 400ms ease; }
  .reveal.show { opacity: 1; transform: translateY(0); }
</style>

{#if !calendar}
  <p class="text-gray-500">{t('calendario.vacio')}</p>
{:else}
  <!-- Full-bleed hero: stacked with centered imagery -->
  <section class="u-full-bleed relative overflow-hidden mb-10">
    <div class="absolute inset-0 -z-10" style="background-color:#edeae6;"></div>
    <div class="u-content-wrap py-10 md:py-20">
      <div class="text-center">
        <h1 class="text-5xl md:text-7xl font-extrabold leading-tight mb-4" style={y(-0.08)}>{t('calendario.hero_title')}</h1>
        <p class="text-base md:text-xl text-gray-700/90 mb-6 max-w-2xl mx-auto" style={y(-0.06)}>{t('calendario.hero_subtitle')}</p>
        <div bind:this={topCtaEl} class="flex flex-col items-center justify-center gap-2 mb-6" style={y(-0.05)}>
          <div class="bg-slate-600/95 text-white backdrop-blur-md rounded-full shadow-2xl ring-1 ring-black/20 px-4 py-2.5 flex items-center gap-3">
            <div class="flex items-center rounded-full bg-white/10 overflow-hidden">
              <button class="px-3 py-1.5 hover:bg-white/15" onclick={() => qty = Math.max(1, qty - 1)}>-</button>
              <input class="w-12 text-center py-1.5 bg-transparent text-white placeholder-white/70 focus:outline-none" type="number" min="1" bind:value={qty} />
              <button class="px-3 py-1.5 hover:bg-white/15" onclick={() => qty = qty + 1}>+</button>
            </div>
            <button class={`rounded-full bg-white text-slate-900 hover:bg-white/90 py-2 px-5 shadow ${flash ? 'ring-4 ring-amber-300/40' : ''}`} onclick={addNow}>
              {t('calendario.buy')}
            </button>
          </div>
          <div class="text-base md:text-lg font-semibold text-gray-900">{fmtCOP.format(calendar.precio)}</div>
        </div>
      </div>
      <div class="relative">
        <div class="rounded-xl overflow-hidden mx-auto max-w-3xl mt-8 md:mt-12" style={y(-0.25)}>
          <img src={'/images/cal_hero_fg.png'} onerror={(e) => fgFallback(e, 'cal_hero_fg')} alt={nameOf(calendar)} class="w-full" />
        </div>
      </div>
    </div>
  </section>

  <!-- Full-bleed feature panels, text above centered image -->
  <section class="space-y-8">
    <!-- Panel 1 -->
    <div class="u-full-bleed bg-cover bg-center py-10 md:py-16" style="background-color:#f5f2ee;" bind:this={p1El}>
      <div class="u-content-wrap">
        <div class="text-center mb-6 reveal" class:show={p1Shown}>
          <h2 class="text-3xl md:text-5xl font-semibold mb-2" style={y(-0.05)}>{t('calendario.f1_title')}</h2>
          <p class="text-gray-700 md:text-lg max-w-2xl mx-auto" style={y(-0.03)}>{t('calendario.f1_body')}</p>
        </div>
        <div class="rounded-xl overflow-hidden mx-auto max-w-2xl reveal" class:show={p1Shown} style={y(-0.08)}>
          <img src={'/images/cal_f1_fg.png'} onerror={(e) => fgFallback(e, 'cal_f1_fg')} alt={nameOf(calendar)} class="w-full" />
        </div>
      </div>
    </div>

    <!-- Panel 2 -->
    <div class="u-full-bleed bg-cover bg-center py-10 md:py-16" style="background-color:#f0f4f8;" bind:this={p2El}>
      <div class="u-content-wrap">
        <div class="text-center mb-6 reveal" class:show={p2Shown}>
          <h2 class="text-3xl md:text-5xl font-semibold mb-2" style={y(-0.05)}>{t('calendario.f2_title')}</h2>
          <p class="text-gray-700 md:text-lg max-w-2xl mx-auto" style={y(-0.03)}>{t('calendario.f2_body')}</p>
        </div>
        <div class="rounded-xl overflow-hidden mx-auto max-w-2xl reveal" class:show={p2Shown} style={y(-0.06)}>
          <img src={'/images/cal_f2_fg.png'} onerror={(e) => fgFallback(e, 'cal_f2_fg')} alt={nameOf(calendar)} class="w-full" />
        </div>
      </div>
    </div>

    <!-- Panel 3 -->
    <div class="u-full-bleed bg-cover bg-center py-10 md:py-16" style="background-color:#eef5ef;" bind:this={p3El}>
      <div class="u-content-wrap">
        <div class="text-center mb-6 reveal" class:show={p3Shown}>
          <h2 class="text-3xl md:text-5xl font-semibold mb-2" style={y(-0.05)}>{t('calendario.f3_title')}</h2>
          <p class="text-gray-700 md:text-lg max-w-2xl mx-auto" style={y(-0.03)}>{t('calendario.f3_body')}</p>
        </div>
        <div class="rounded-xl overflow-hidden mx-auto max-w-2xl reveal" class:show={p3Shown} style={y(-0.05)}>
          <img src={'/images/cal_f3_fg.png'} onerror={(e) => fgFallback(e, 'cal_f3_fg')} alt={nameOf(calendar)} class="w-full" />
        </div>
      </div>
    </div>

    <!-- Panel 4 -->
    <div class="u-full-bleed bg-cover bg-center py-10 md:py-16" style="background-color:#f7eff9;" bind:this={p4El}>
      <div class="u-content-wrap">
        <div class="text-center mb-6 reveal" class:show={p4Shown}>
          <h2 class="text-3xl md:text-5xl font-semibold mb-2" style={y(-0.05)}>{t('calendario.f4_title')}</h2>
          <p class="text-gray-700 md:text-lg max-w-2xl mx-auto" style={y(-0.03)}>{t('calendario.f4_body')}</p>
        </div>
        <div class="rounded-xl overflow-hidden mx-auto max-w-2xl reveal" class:show={p4Shown} style={y(-0.04)}>
          <img src={'/images/cal_f4_fg.png'} onerror={(e) => fgFallback(e, 'cal_f4_fg')} alt={nameOf(calendar)} class="w-full" />
        </div>
      </div>
    </div>
  </section>

  <!-- Sticky buy bar: appears only when top CTA is NOT visible, with fade/slide -->
  <div class="fixed bottom-4 inset-x-0 flex justify-center pointer-events-none">
    <div class="bg-slate-600/95 text-white backdrop-blur-md rounded-full shadow-2xl ring-1 ring-black/20 px-4 py-2.5 flex items-center gap-3 transition-all duration-200 pointer-events-auto"
      style={`opacity:${showSticky ? 1 : 0}; transform: translateY(${showSticky ? 0 : 8}px);`}
    >
      <span class="font-medium hidden sm:inline">{nameOf(calendar)}</span>
      <div class="flex items-center rounded-full bg-white/10 overflow-hidden">
        <button class="px-3 py-1.5 hover:bg-white/15" onclick={() => qty = Math.max(1, qty - 1)}>-</button>
        <input class="w-12 text-center py-1.5 bg-transparent text-white placeholder-white/70 focus:outline-none" type="number" min="1" bind:value={qty} />
        <button class="px-3 py-1.5 hover:bg-white/15" onclick={() => qty = qty + 1}>+</button>
      </div>
      <button class={`rounded-full bg-white text-slate-900 hover:bg-white/90 py-2 px-5 shadow ${flash ? 'ring-4 ring-amber-300/40' : ''}`} onclick={addNow}>
        {t('calendario.buy')}
      </button>
    </div>
  </div>
{/if}
