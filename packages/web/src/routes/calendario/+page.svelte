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
  import './calendario.css';

  const splitFirstWord = (text: string) => {
    const trimmed = (text ?? '').trimStart();
    if (!trimmed) return { lead: '', rest: '' };
    const match = trimmed.match(/^(\S+)([\s\S]*)$/);
    if (!match) return { lead: trimmed, rest: '' };
    const lead = match[1];
    const rest = match[2]?.replace(/^\s*/, ' ');
    return { lead, rest: rest ?? '' };
  };

  const nameOf = (p: Product) =>
    p.nombre[getLocale() as 'es' | 'en'] ?? p.nombre.es ?? p.nombre.en ?? '';

  let { data } = $props<{ data: { products: Product[] } }>();
  const calendar = $derived(data.products?.[0]);
  let flash = $state(false);

  const heroSubtitleText = $derived(t('calendario.hero_subtitle'));
  const heroSubtitleParts = $derived(splitFirstWord(heroSubtitleText));

  const heroImageSrc = getResizedImageUrl('/images/IMG_5710.jpg', 1600);
  const heroImageSrcSmall = getResizedImageUrl('/images/IMG_5710.jpg', 800);
  const galleryImageSrc = getResizedImageUrl('/images/IMG_5882.HEIC', 1600);
  const galleryImageSrcSmall = getResizedImageUrl('/images/IMG_5882.HEIC', 800);
  const featureVideoSrc = '/video/IMG_5880.MOV';

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
        <div class="calendar-primary__cta">
          <button
            class={`calendar-primary__button ${flash ? 'flash' : ''}`}
            type="button"
            onclick={addNow}
          >
            {t('calendario.buy_simple') ?? t('calendario.buy')}
          </button>
        </div>
        <span class="calendar-primary__eyebrow">{t('calendario.hero_eyebrow')}</span>
        <p class="calendar-primary__body">
          {#if heroSubtitleParts.lead}
            <span class="calendar-primary__drop">{heroSubtitleParts.lead}</span>{heroSubtitleParts.rest}
          {:else}
            {heroSubtitleText}
          {/if}
        </p>
      </div>
    </div>
  </section>

  <section class="calendar-video u-full-bleed">
    <div class="calendar-video__media">
      <video
        playsinline
        autoplay
        muted
        loop
        preload="metadata"
        poster={galleryImageSrcSmall || heroImageSrc}
      >
        <source src={featureVideoSrc} type="video/quicktime" />
        <source src={featureVideoSrc} type="video/mp4" />
      </video>
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
