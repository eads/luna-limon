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
  import { getResizedImageUrl } from '$lib/utils/images';

  const nameOf = (p: Product) =>
    p.nombre[getLocale() as 'es' | 'en'] ?? p.nombre.es ?? p.nombre.en ?? '';

  let { data } = $props<{ data: { products: Product[] } }>();
  const calendar = $derived(data.products?.[0]);
  let flash = $state(false);

  let heroDimmed = $state(false);
  let galleryDimmed = $state(false);
  let gallerySection: HTMLElement | null = null;

  function addNow() {
    if (!calendar) return;
    cart.add(calendar, 1);
    flash = true;
    setTimeout(() => (flash = false), 700);
    goto(localizeHref('/pagar'));
  }

  onMount(() => {
    if (!browser) return;
    const handleScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      heroDimmed = y > window.innerHeight * 0.3;

      if (gallerySection) {
        const rect = gallerySection.getBoundingClientRect();
        const trigger = window.innerHeight * 0.45;
        galleryDimmed = rect.top < trigger;
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  });
</script>

<style>
  .calendar-visual {
    position: relative;
    height: min(80vh, 620px);
    overflow: hidden;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .calendar-visual__image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 48%;
    transform-origin: center;
    transition: transform 480ms ease, opacity 320ms ease;
  }
  .calendar-visual.dimmed .calendar-visual__image {
    opacity: 0.52;
    transform: scale(1.045) translateY(-2%);
  }
  .calendar-visual__title {
    position: relative;
    z-index: 1;
    margin-bottom: clamp(2rem, 7vw, 3.5rem);
    padding: 0 clamp(1.5rem, 6vw, 3rem);
    font-size: clamp(2.6rem, 6.2vw, 3.9rem);
    line-height: 1.08;
    font-weight: 600;
    color: #fefaf6;
    text-shadow: 0 12px 30px rgba(12, 6, 4, 0.42);
    text-wrap: balance;
    transition: transform 480ms ease;
    font-family: 'Etania Ezra Script', cursive;
  }
  .calendar-visual.dimmed .calendar-visual__title {
    transform: translateY(-4vh);
  }
  .calendar-primary {
    background: rgba(255, 255, 255, 0.92);
    padding: clamp(3.5rem, 8vw, 5.5rem) 0 clamp(3rem, 7vw, 5rem);
  }
  .calendar-primary__wrap {
    max-width: 44rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: clamp(1.3rem, 3vw, 2.2rem);
  }
  .calendar-primary__eyebrow {
    display: inline-flex;
    align-self: flex-start;
    padding: 0.35rem 0.9rem;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(190, 180, 210, 0.28), rgba(240, 130, 100, 0.38));
    color: #5c4b75;
    font-size: 0.78rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 600;
    font-family: 'Aceh', 'Helvetica Neue', sans-serif;
  }
  .calendar-primary__body {
    font-size: clamp(1.05rem, 2.4vw, 1.35rem);
    line-height: 1.7;
    color: rgba(44, 26, 34, 0.85);
    font-family: 'Aceh', 'Helvetica Neue', sans-serif;
  }
  .calendar-primary__cta {
    display: inline-flex;
    align-items: center;
    gap: 0.9rem;
  }
  .calendar-primary__button {
    border-radius: 999px;
    padding: 0.75rem 2.5rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 2px solid rgba(240, 130, 100, 0.8);
    color: #402430;
    background: transparent;
    transition: transform 150ms ease, border-color 180ms ease, color 180ms ease;
    font-family: 'Aceh', 'Helvetica Neue', sans-serif;
  }
  .calendar-primary__button:hover {
    transform: translateY(-1px);
    border-color: rgba(190, 180, 210, 0.9);
    color: #3b2a47;
  }
  .calendar-primary__button:active {
    transform: translateY(0);
  }
  .calendar-primary__button.flash {
    box-shadow: 0 0 0 4px rgba(240, 130, 100, 0.18);
  }
  .calendar-gallery {
    position: relative;
    overflow: hidden;
    background: #f4f1f9;
    margin-bottom: clamp(3rem, 12vw, 7rem);
  }
  .calendar-gallery__media {
    position: relative;
    height: min(72vh, 580px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .calendar-gallery__img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 52%;
    transform-origin: center;
    transition: transform 480ms ease, opacity 320ms ease;
  }
  .calendar-gallery.dimmed .calendar-gallery__img {
    opacity: 0.58;
    transform: scale(1.045) translateY(-2%);
  }
  .calendar-gallery__title {
    position: relative;
    z-index: 1;
    padding: 0 clamp(1.5rem, 6vw, 3rem) clamp(2.5rem, 8vw, 4rem);
    font-size: clamp(2.1rem, 5vw, 3.2rem);
    line-height: 1.12;
    font-weight: 600;
    color: #faf6ff;
    text-shadow: 0 10px 26px rgba(22, 12, 6, 0.4);
    text-wrap: balance;
    transition: transform 480ms ease;
    font-family: 'Etania Ezra Script', cursive;
  }
  .calendar-gallery.dimmed .calendar-gallery__title {
    transform: translateY(-3vh);
  }
  .calendar-story {
    background: rgba(255, 255, 255, 0.88);
    padding: clamp(3.5rem, 9vw, 6rem) 0 clamp(3rem, 9vw, 6.5rem);
  }
  .calendar-story__wrap {
    max-width: 42rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: clamp(1.1rem, 2.8vw, 1.9rem);
  }
  .calendar-story__label {
    display: inline-flex;
    align-self: flex-start;
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    background: rgba(190, 180, 210, 0.18);
    color: #5c4b75;
    font-size: 0.78rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: 'Aceh', 'Helvetica Neue', sans-serif;
  }
  .calendar-story__title {
    font-size: clamp(2rem, 4.5vw, 2.6rem);
    line-height: 1.18;
    font-weight: 600;
    color: #2b1624;
    font-family: 'Aceh', 'Helvetica Neue', sans-serif;
  }
  .calendar-story__body {
    font-size: clamp(1rem, 2.2vw, 1.2rem);
    line-height: 1.6;
    color: rgba(43, 23, 31, 0.78);
    font-family: 'Aceh', 'Helvetica Neue', sans-serif;
  }
  .calendar-story__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    color: rgba(43, 23, 31, 0.82);
    font-weight: 500;
    font-family: 'Aceh', 'Helvetica Neue', sans-serif;
  }
  .calendar-story__list li::before {
    content: '—';
    margin-right: 0.75rem;
    color: #f08264;
  }
  @media (min-width: 768px) {
    .calendar-primary__cta {
      flex-direction: row;
      align-items: center;
    }
    .calendar-story__wrap {
      gap: clamp(1.4rem, 2vw, 2.2rem);
    }
  }
  @media (max-width: 640px) {
    .calendar-visual {
      height: 66vh;
    }
    .calendar-visual__image {
      height: 66vh;
      object-position: center 52%;
    }
    .calendar-primary__wrap {
      gap: 1.4rem;
    }
    .calendar-primary__cta {
      flex-direction: column;
      align-items: stretch;
    }
    .calendar-primary__button {
      width: 100%;
      justify-content: center;
    }
    .calendar-gallery__media {
      height: 60vh;
    }
    .calendar-gallery__img {
      height: 60vh;
      object-position: center 54%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .calendar-visual__image,
    .calendar-visual.dimmed .calendar-visual__image,
    .calendar-primary__button,
    .calendar-primary__button.flash {
      transition: none;
    }
  }
</style>

{#if !calendar}
  <p class="text-gray-500">{t('calendario.vacio')}</p>
{:else}
  <section class="calendar-visual u-full-bleed" class:dimmed={heroDimmed}>
    <img class="calendar-visual__image" src={getResizedImageUrl('/images/IMG_5710.jpg', 1600)} alt={nameOf(calendar)} loading="eager" decoding="async" />
    <h1 class="calendar-visual__title">{t('calendario.hero_title')}</h1>
  </section>

  <section class="calendar-primary u-full-bleed">
    <div class="u-content-wrap">
      <div class="calendar-primary__wrap">
        <span class="calendar-primary__eyebrow">{t('calendario.hero_eyebrow')}</span>
        <p class="calendar-primary__body">{t('calendario.hero_subtitle')}</p>
        <div class="calendar-primary__cta">
          <button
            class={`calendar-primary__button ${flash ? 'flash' : ''}`}
            type="button"
            onclick={addNow}
          >
            {t('calendario.buy_simple') ?? t('calendario.buy')}
          </button>
        </div>
      </div>
    </div>
  </section>

  <section class="calendar-gallery u-full-bleed" bind:this={gallerySection} class:dimmed={galleryDimmed}>
    <div class="calendar-gallery__media">
      <img class="calendar-gallery__img" src={getResizedImageUrl('/images/IMG_5716.jpg', 1600)} alt={nameOf(calendar)} loading="lazy" />
      <h2 class="calendar-gallery__title">{t('calendario.story_title')}</h2>
    </div>
  </section>

  <section class="calendar-story u-full-bleed">
    <div class="u-content-wrap">
      <div class="calendar-story__wrap">
        <span class="calendar-story__label">{t('calendario.story_placeholder_label')}</span>
        <p class="calendar-story__body">{t('calendario.story_body')}</p>
        <ul class="calendar-story__list" aria-label={t('calendario.story_list_label')}>
          <li>{t('calendario.story_point_1')}</li>
          <li>{t('calendario.story_point_2')}</li>
          <li>{t('calendario.story_point_3')}</li>
        </ul>
      </div>
    </div>
  </section>
{/if}
