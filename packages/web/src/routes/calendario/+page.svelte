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
  import { getResizedImageUrl } from '$lib/utils/images';

  const nameOf = (p: Product) =>
    p.nombre[getLocale() as 'es' | 'en'] ?? p.nombre.es ?? p.nombre.en ?? '';

  let { data } = $props<{ data: { products: Product[] } }>();
  const calendar = $derived(data.products?.[0]);
  let flash = $state(false);

  const heroImageSrc = getResizedImageUrl('/images/IMG_5710.jpg', 1600);
  const heroImageSrcSmall = getResizedImageUrl('/images/IMG_5710.jpg', 800);
  const galleryImageSrc = getResizedImageUrl('/images/IMG_5716.jpg', 1600);
  const galleryImageSrcSmall = getResizedImageUrl('/images/IMG_5716.jpg', 800);

  function addNow() {
    if (!calendar) return;
    cart.add(calendar, 1);
    flash = true;
    setTimeout(() => (flash = false), 700);
    goto(localizeHref('/pagar'));
  }
</script>

<svelte:head>
  <link rel="preload" as="image" href={heroImageSrc} fetchpriority="high" />
</svelte:head>
<style>
  .calendar-hero {
    position: relative;
    min-height: clamp(420px, 72vh, 640px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    color: #fef9f4;
  }
  .calendar-hero__media {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  .calendar-hero__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 48%;
  }
  .calendar-hero__scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(22, 12, 8, 0) 0%,
      rgba(22, 12, 8, 0) 48%,
      rgba(22, 12, 8, 0.4) 72%,
      rgba(22, 12, 8, 0.72) 100%
    );
  }
  .calendar-hero__content {
    position: relative;
    z-index: 1;
    width: 100%;
    padding: clamp(3rem, 12vw, 5.5rem) clamp(1.5rem, 6vw, 3.5rem);
    text-align: center;
  }
  .calendar-hero__title {
    font-size: clamp(2.9rem, 7vw, 4.7rem);
    line-height: 1.08;
    font-weight: 500;
    text-wrap: balance;
    margin: 0;
    text-shadow: 0 12px 32px rgba(12, 6, 4, 0.62);
    font-family: 'Elgraine', 'Aceh', 'Helvetica Neue', sans-serif;
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
    background: #f4f1f9;
    padding: clamp(3rem, 9vw, 5.5rem) 0;
  }
  .calendar-gallery__media {
    position: relative;
    max-width: 72rem;
    margin: 0 auto;
  }
  .calendar-gallery__img {
    display: block;
    width: 100%;
    height: min(68vh, 520px);
    object-fit: cover;
    object-position: center 52%;
  }
  .calendar-gallery__caption {
    position: absolute;
    inset: auto 0 0 0;
    padding: clamp(1.9rem, 5vw, 3rem) clamp(1.5rem, 6vw, 3rem);
    background: linear-gradient(0deg, rgba(18, 10, 6, 0.78) 0%, rgba(18, 10, 6, 0) 70%);
    color: #faf6ff;
    text-align: center;
  }
  .calendar-gallery__title {
    font-size: clamp(2.1rem, 5vw, 3.2rem);
    line-height: 1.12;
    font-weight: 500;
    text-wrap: balance;
    font-family: 'Elgraine', 'Aceh', 'Helvetica Neue', sans-serif;
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
    .calendar-hero {
      min-height: 60vh;
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
    .calendar-gallery__img {
      height: min(60vh, 420px);
      object-position: center 54%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .calendar-primary__button,
    .calendar-primary__button.flash {
      transition: none;
    }
  }

  .calendar-ending {
    min-height: clamp(5rem, 14vw, 9rem);
    background: #fffdf8;
  }
</style>

{#if !calendar}
  <p class="text-gray-500">{t('calendario.vacio')}</p>
{:else}
  <section class="calendar-hero u-full-bleed">
    <picture class="calendar-hero__media">
      <source srcset={`${heroImageSrcSmall} 800w, ${heroImageSrc} 1600w`} sizes="(max-width: 768px) 100vw, 1600px" />
      <img class="calendar-hero__img" src={heroImageSrc} alt={nameOf(calendar)} loading="eager" fetchpriority="high" />
    </picture>
    <span class="calendar-hero__scrim" aria-hidden="true"></span>
    <div class="calendar-hero__content">
      <h1 class="calendar-hero__title">{t('calendario.hero_title')}</h1>
    </div>
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

  <section class="calendar-gallery u-full-bleed">
    <div class="calendar-gallery__media">
      <img
        class="calendar-gallery__img"
        src={galleryImageSrc}
        srcset={`${galleryImageSrcSmall} 800w, ${galleryImageSrc} 1600w`}
        sizes="(max-width: 768px) 100vw, 1600px"
        alt={nameOf(calendar)}
        loading="lazy"
        decoding="async"
      />
      <div class="calendar-gallery__caption">
        <h2 class="calendar-gallery__title">{t('calendario.story_title')}</h2>
      </div>
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

  <section class="calendar-ending u-full-bleed" aria-hidden="true"></section>
{/if}
