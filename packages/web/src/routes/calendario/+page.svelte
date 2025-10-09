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
  // @ts-expect-error - runtime types not generated yet
  import { getLocale, localizeHref } from '$lib/paraglide/runtime.js';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  const nameOf = (p: Product) => p.nombre[getLocale() as 'es' | 'en'] ?? p.nombre.es ?? p.nombre.en ?? '';
  const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  let { data } = $props<{ data: { products: Product[] } }>();
  const calendar = $derived(data.products?.[0]);
  let qty = $state(1);
  let flash = $state(false);

  function addNow() {
    if (!calendar) return;
    cart.add(calendar, qty || 1);
    flash = true;
    setTimeout(() => (flash = false), 700);
    goto(localizeHref('/pagar'));
  }

  let topCtaEl: HTMLElement | null = null;
  let storyEl: HTMLElement | null = null;
  let topCtaInView = $state(true);
  let showSecondBg = $state(false);
  const showSticky = $derived(!topCtaInView);

  function updateBackgroundState() {
    if (!browser) return;
    const trigger = window.innerHeight * 0.18;
    const y = window.scrollY || 0;
    showSecondBg = y > trigger;
  }

  onMount(() => {
    if (!browser) {
      topCtaInView = true;
      showSecondBg = true;
      return;
    }
    const handleScroll = () => updateBackgroundState();
    window.addEventListener('scroll', handleScroll, { passive: true });
    updateBackgroundState();

    if (typeof IntersectionObserver === 'undefined') {
      return () => {
        window.removeEventListener('scroll', handleScroll);
      };
    }
    const observers: IntersectionObserver[] = [];
    if (topCtaEl) {
      const ctaObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          topCtaInView = !!entry?.isIntersecting;
        },
        { threshold: 0.6 }
      );
      ctaObserver.observe(topCtaEl);
      observers.push(ctaObserver);
    }
    if (storyEl) {
      const storyObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          const intersecting = !!entry.isIntersecting || (entry.boundingClientRect.top ?? 1) < 0;
          if (intersecting) {
            showSecondBg = true;
          }
        },
        { threshold: [0.1, 0.3] }
      );
      storyObserver.observe(storyEl);
      observers.push(storyObserver);
    }
    return () => {
      window.removeEventListener('scroll', handleScroll);
      observers.forEach((observer) => observer.disconnect());
    };
  });
</script>

<style>
  .calendar-page {
    position: relative;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    gap: clamp(4rem, 12vw, 6rem);
  }
  .calendar-page__background {
    position: fixed;
    inset: 0;
    background-size: auto 100%;
    background-repeat: no-repeat;
    background-position: center;
    background-color: #f6ede3;
    z-index: -3;
    pointer-events: none;
    transition: opacity 900ms ease, transform 1200ms ease;
    will-change: opacity, transform;
  }
  .calendar-page__background--primary {
    background-image: url('/images/IMG_5709.jpg');
    transform: scale(1.05);
  }
  .calendar-page__background--secondary {
    background-image: url('/images/IMG_5718.jpg');
    opacity: 0;
    transform: scale(1.08);
  }
  .calendar-page.show-second .calendar-page__background--primary {
    opacity: 0;
    transform: scale(1.02);
  }
  .calendar-page.show-second .calendar-page__background--secondary {
    opacity: 1;
    transform: scale(1.04);
  }
  .calendar-page__scrim {
    position: fixed;
    inset: 0;
    z-index: -2;
    pointer-events: none;
    background: linear-gradient(155deg, rgba(38, 22, 14, 0.62) 0%, rgba(24, 14, 8, 0.54) 42%, rgba(18, 10, 6, 0.45) 68%, rgba(255, 233, 204, 0.32) 100%);
    mix-blend-mode: multiply;
    transition: background 600ms ease;
  }
  .calendar-page.show-second .calendar-page__scrim {
    background: linear-gradient(120deg, rgba(32, 18, 10, 0.55) 0%, rgba(26, 14, 8, 0.5) 52%, rgba(255, 221, 187, 0.38) 100%);
  }
  .calendar-hero {
    position: relative;
    min-height: 110svh;
    padding: clamp(5rem, 10vw, 8rem) 0 clamp(4rem, 8vw, 6rem);
    display: flex;
    align-items: center;
    color: #fef9f4;
  }
  .calendar-hero__inner {
    position: relative;
    z-index: 1;
    max-width: clamp(32rem, 68vw, 52rem);
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    margin-left: clamp(0rem, 5vw, 8rem);
  }
  .calendar-hero__eyebrow {
    display: inline-flex;
    align-self: flex-start;
    border-radius: 999px;
    border: 1px solid rgba(255, 237, 213, 0.3);
    background: rgba(255, 244, 228, 0.08);
    color: #ffe5c6;
    padding: 0.25rem 0.9rem;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .calendar-hero__title {
    font-size: clamp(2.8rem, 7.8vw, 5.1rem);
    line-height: 1.08;
    font-weight: 700;
    letter-spacing: -0.01em;
    text-wrap: balance;
    color: rgba(255, 244, 233, 0.96);
  }
  .calendar-hero__subtitle {
    font-size: clamp(1.05rem, 2.5vw, 1.35rem);
    line-height: 1.7;
    color: rgba(255, 248, 236, 0.88);
    max-width: 60ch;
    font-weight: 300;
  }
  .calendar-hero__actions {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    align-items: flex-start;
  }
  .calendar-hero__cta {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    border-radius: 1.9rem;
    padding: 1.4rem 1.6rem;
    background: rgba(255, 240, 216, 0.22);
    border: 1px solid rgba(255, 235, 205, 0.3);
    backdrop-filter: blur(18px);
    color: #3a2011;
    box-shadow: 0 30px 60px -42px rgba(12, 6, 3, 0.7);
  }
  .calendar-hero__cta-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.85rem;
  }
  .calendar-hero__qty {
    display: inline-flex;
    border-radius: 999px;
    border: 1px solid rgba(60, 31, 15, 0.16);
    overflow: hidden;
    background: rgba(255, 245, 224, 0.48);
  }
  .calendar-hero__qty button {
    padding: 0.6rem 1rem;
    font-weight: 600;
    transition: background 150ms ease, color 150ms ease;
    color: #3c1f0f;
  }
  .calendar-hero__qty button:hover {
    background: rgba(255, 240, 220, 0.75);
  }
  .calendar-hero__qty input {
    width: 3.2rem;
    text-align: center;
    border: none;
    background: transparent;
    font-weight: 600;
    color: #2f180d;
  }
  .calendar-hero__buy {
    border-radius: 999px;
    padding: 0.75rem 2.2rem;
    font-weight: 700;
    font-size: 1.05rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: #2d1708;
    background: linear-gradient(135deg, #fff5dc, #ffdcb3);
    border: 1px solid rgba(255, 214, 170, 0.7);
    box-shadow: 0 18px 46px -26px rgba(45, 25, 12, 0.7);
    transition: transform 150ms ease, box-shadow 200ms ease, background 150ms ease, color 150ms ease;
  }
  .calendar-hero__buy:hover {
    background: linear-gradient(135deg, #fff0d0, #ffd2a1);
    transform: translateY(-1px);
    box-shadow: 0 22px 52px -30px rgba(45, 25, 12, 0.72);
  }
  .calendar-hero__buy:active {
    transform: translateY(0);
  }
  .calendar-hero__buy--flash {
    box-shadow: 0 0 0 4px rgba(255, 221, 173, 0.45), 0 22px 50px -26px rgba(45, 25, 12, 0.85);
  }
  .calendar-hero__meta {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    color: rgba(56, 32, 21, 0.82);
  }
  .calendar-hero__price {
    font-weight: 700;
    font-size: 1.05rem;
  }
  .calendar-hero__note {
    font-size: 0.95rem;
  }
  .calendar-hero__follow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.85rem;
    border-radius: 999px;
    padding: 0.85rem 2.3rem;
    background: linear-gradient(135deg, rgba(255, 244, 222, 0.26), rgba(255, 210, 164, 0.3));
    border: 1px solid rgba(255, 224, 187, 0.45);
    color: #ffe8c9;
    font-weight: 600;
    text-decoration: none;
    box-shadow: 0 22px 54px -34px rgba(21, 10, 5, 0.75);
    transition: transform 150ms ease, box-shadow 200ms ease, background 150ms ease;
  }
  .calendar-hero__follow:hover {
    background: linear-gradient(135deg, rgba(255, 244, 214, 0.42), rgba(255, 210, 160, 0.4));
    transform: translateY(-1px);
    box-shadow: 0 26px 60px -34px rgba(21, 10, 5, 0.78);
  }
  .calendar-hero__follow-icon {
    font-size: 1.4rem;
    line-height: 0;
  }
  .calendar-hero__follow-handle {
    font-weight: 700;
    letter-spacing: 0.03em;
  }
  .calendar-story {
    position: relative;
    padding: clamp(5rem, 10vw, 7rem) 0 clamp(4rem, 8vw, 6rem);
    color: #2e1a11;
  }
  .calendar-story__panel {
    position: relative;
    max-width: clamp(28rem, 60vw, 42rem);
    margin-inline: auto;
    background: rgba(255, 252, 245, 0.82);
    backdrop-filter: blur(22px);
    border-radius: 1.6rem;
    padding: clamp(2rem, 5vw, 3rem);
    box-shadow: 0 36px 74px -44px rgba(36, 19, 10, 0.42);
    border: 1px dashed rgba(219, 168, 120, 0.5);
  }
  .calendar-story__placeholder-label {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border-radius: 999px;
    padding: 0.35rem 0.9rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    background: rgba(255, 229, 196, 0.45);
    color: rgba(110, 60, 30, 0.75);
    margin-bottom: 1.25rem;
  }
  .calendar-story__title {
    font-size: clamp(2rem, 5vw, 2.9rem);
    line-height: 1.2;
    font-weight: 700;
    margin-bottom: 1rem;
    color: #2a160e;
  }
  .calendar-story__body {
    font-size: 1.05rem;
    line-height: 1.7;
    color: rgba(52, 30, 18, 0.9);
    margin-bottom: 1.5rem;
  }
  .calendar-story__list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0;
    margin: 0;
  }
  .calendar-story__list li {
    position: relative;
    padding-left: 1.9rem;
    font-weight: 500;
    color: rgba(43, 23, 13, 0.92);
  }
  .calendar-story__list li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.55rem;
    width: 1rem;
    height: 1rem;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(255, 182, 118, 0.95), rgba(255, 210, 150, 0.9));
    box-shadow: 0 12px 24px -12px rgba(220, 120, 70, 0.6);
  }
  .calendar-sticky {
    background: rgba(34, 19, 12, 0.94);
    color: #fff4dc;
    border-radius: 999px;
    padding: 0.65rem 1.2rem;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    box-shadow: 0 24px 40px -30px rgba(12, 6, 3, 0.9);
    backdrop-filter: blur(14px);
  }
  .calendar-sticky__label {
    font-weight: 600;
    display: none;
  }
  .calendar-sticky__qty {
    display: inline-flex;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    overflow: hidden;
    background: rgba(255, 255, 255, 0.15);
  }
  .calendar-sticky__qty button {
    padding: 0.5rem 0.9rem;
    font-weight: 600;
    color: #ffead0;
    transition: background 150ms ease;
  }
  .calendar-sticky__qty button:hover {
    background: rgba(255, 237, 210, 0.2);
  }
  .calendar-sticky__qty input {
    width: 3rem;
    text-align: center;
    border: none;
    background: transparent;
    color: #fff2d6;
    font-weight: 600;
  }
  .calendar-sticky__buy {
    border-radius: 999px;
    padding: 0.6rem 1.4rem;
    font-weight: 700;
    background: linear-gradient(135deg, #ffe2b5, #ffd099);
    color: #341a0d;
    box-shadow: 0 18px 40px -24px rgba(15, 6, 2, 0.9);
    transition: transform 150ms ease, box-shadow 200ms ease;
  }
  .calendar-sticky__buy:hover {
    transform: translateY(-1px);
    box-shadow: 0 20px 42px -25px rgba(15, 6, 2, 0.8);
  }
  .calendar-sticky__buy:active {
    transform: translateY(0);
  }
  .calendar-sticky__buy--flash {
    box-shadow: 0 0 0 4px rgba(255, 207, 160, 0.4);
  }
  .calendar-sticky__note {
    font-size: 0.85rem;
    color: rgba(255, 244, 220, 0.75);
  }
  @media (min-width: 768px) {
    .calendar-hero {
      padding-bottom: clamp(6rem, 8vw, 10rem);
    }
    .calendar-hero__inner {
      margin-left: clamp(2rem, 8vw, 12rem);
    }
    .calendar-hero__actions {
      flex-direction: row;
      align-items: flex-start;
      gap: 1.6rem;
    }
    .calendar-hero__follow {
      margin-top: 0.5rem;
    }
    .calendar-sticky__label {
      display: inline;
    }
  }
  @media (max-width: 640px) {
    .calendar-page__background {
      background-size: cover;
    }
    .calendar-hero__inner {
      margin-left: 0;
      text-align: left;
    }
    .calendar-hero__cta {
      align-items: stretch;
    }
    .calendar-hero__qty {
      align-self: stretch;
      justify-content: space-between;
    }
    .calendar-story {
      padding: 5rem 0 4rem;
    }
    .calendar-story__panel {
      margin-inline: 0;
    }
    .calendar-sticky {
      gap: 0.6rem;
      padding-inline: 1rem;
    }
  }
</style>

{#if !calendar}
  <p class="text-gray-500">{t('calendario.vacio')}</p>
{:else}
  <div class="calendar-page u-full-bleed" class:show-second={showSecondBg}>
    <div class="calendar-page__background calendar-page__background--primary" aria-hidden="true"></div>
    <div class="calendar-page__background calendar-page__background--secondary" aria-hidden="true"></div>
    <div class="calendar-page__scrim" aria-hidden="true"></div>

    <section class="calendar-hero">
      <div class="u-content-wrap">
        <div class="calendar-hero__inner">
          <span class="calendar-hero__eyebrow">{t('calendario.hero_eyebrow')}</span>
          <h1 class="calendar-hero__title">{t('calendario.hero_title')}</h1>
          <p class="calendar-hero__subtitle">{t('calendario.hero_subtitle')}</p>
          <div class="calendar-hero__actions">
            <div class="calendar-hero__cta" bind:this={topCtaEl}>
              <div class="calendar-hero__cta-controls">
                <div class="calendar-hero__qty">
                  <button type="button" aria-label={t('calendario.qty_decrease')} onclick={() => (qty = Math.max(1, qty - 1))}>-</button>
                  <input type="number" min="1" bind:value={qty} aria-label={t('calendario.qty_input')} />
                  <button type="button" aria-label={t('calendario.qty_increase')} onclick={() => (qty = qty + 1)}>+</button>
                </div>
                <button class={`calendar-hero__buy ${flash ? 'calendar-hero__buy--flash' : ''}`} type="button" onclick={addNow}>
                  {t('calendario.buy')}
                </button>
              </div>
              <div class="calendar-hero__meta">
                <span class="calendar-hero__price">{fmtCOP.format(calendar.precio)}</span>
                <span class="calendar-hero__note">{t('calendario.preorder')}</span>
              </div>
            </div>
            <a class="calendar-hero__follow" href="https://www.instagram.com/lunalimon.co" target="_blank" rel="noopener noreferrer">
              <span class="calendar-hero__follow-icon" aria-hidden="true">◎</span>
              <span>{t('calendario.follow_cta')}</span>
              <span class="calendar-hero__follow-handle">{t('calendario.follow_handle')}</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <section class="calendar-story" bind:this={storyEl}>
      <div class="u-content-wrap">
        <div class="calendar-story__panel">
          <span class="calendar-story__placeholder-label">{t('calendario.story_placeholder_label')}</span>
          <h2 class="calendar-story__title">{t('calendario.story_title')}</h2>
          <p class="calendar-story__body">{t('calendario.story_body')}</p>
          <ul class="calendar-story__list" aria-label={t('calendario.story_list_label')}>
            <li>{t('calendario.story_point_1')}</li>
            <li>{t('calendario.story_point_2')}</li>
            <li>{t('calendario.story_point_3')}</li>
          </ul>
        </div>
      </div>
    </section>
  </div>

  <div class="fixed bottom-4 inset-x-0 flex justify-center pointer-events-none">
    <div
      class="calendar-sticky pointer-events-auto"
      style={`opacity:${showSticky ? 1 : 0}; transform: translateY(${showSticky ? 0 : 8}px); transition: opacity 200ms ease, transform 200ms ease;`}
    >
      <span class="calendar-sticky__label">{nameOf(calendar)}</span>
      <div class="calendar-sticky__qty">
        <button type="button" aria-label={t('calendario.qty_decrease')} onclick={() => (qty = Math.max(1, qty - 1))}>-</button>
        <input type="number" min="1" bind:value={qty} aria-label={t('calendario.qty_input')} />
        <button type="button" aria-label={t('calendario.qty_increase')} onclick={() => (qty = qty + 1)}>+</button>
      </div>
      <button class={`calendar-sticky__buy ${flash ? 'calendar-sticky__buy--flash' : ''}`} type="button" onclick={addNow}>
        {t('calendario.buy')}
      </button>
      <span class="calendar-sticky__note">{t('calendario.preorder')}</span>
    </div>
  </div>
{/if}
