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
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { browser } from '$app/environment';
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

  const heroImageDesktopLg = getResizedImageUrl('/images/IMG_6395-horizontal.jpg', 2800);
  const heroImageDesktopMd = getResizedImageUrl('/images/IMG_6395-horizontal.jpg', 2000);
  const heroImageDesktopSm = getResizedImageUrl('/images/IMG_6395-horizontal.jpg', 1400);
  const heroImageMobileLg = getResizedImageUrl('/images/IMG_6395-vertical.jpg', 1600);
  const heroImageMobileSm = getResizedImageUrl('/images/IMG_6395-vertical.jpg', 900);
  const highlightImageSrc = getResizedImageUrl('/images/IMG_6403.jpg', 1600);
  const highlightImageSrcSmall = getResizedImageUrl('/images/IMG_6403.jpg', 820);
  const galleryImageSrc = getResizedImageUrl('/images/IMG_6395.jpg', 1600);
  const galleryImageSrcSmall = getResizedImageUrl('/images/IMG_6395.jpg', 800);
  const featureVideoSources = [
    { src: '/video/IMG_6469-mobile.webm', type: 'video/webm', media: '(max-width: 640px)' },
    { src: '/video/IMG_6472-desktop.webm', type: 'video/webm' },
  ];

  let heroSection: HTMLElement | undefined;
  let heroProgress = $state(0);
  let stickyObserver: IntersectionObserver | undefined;
  let showStickyCta = $state(false);
  const ctaText = $derived(t('calendario.buy_simple') ?? t('calendario.buy'));
  let stickySentinel: HTMLElement | undefined;

  function addNow() {
    if (!calendar) return;
    cart.add(calendar, 1);
    flash = true;
    setTimeout(() => (flash = false), 700);
    goto(localizeHref('/pagar'));
  }

  function fadeIn(node: HTMLElement, options?: { delay?: number }) {
    if (!browser) return;
    const delay = options?.delay ?? 0;
    node.classList.add('fade-ready');
    node.style.setProperty('--fade-delay', `${delay}ms`);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        node.classList.add('fade-visible');
        observer.disconnect();
      }
    }, { threshold: 0.15 });
    observer.observe(node);
    return {
      destroy() {
        observer.disconnect();
      }
    };
  }

  onMount(() => {
    if (!browser) return;
    const handle = () => {
      if (!heroSection) return;
      const rect = heroSection.getBoundingClientRect();
      const progress = rect.height > 0 ? Math.min(Math.max(-rect.top / rect.height, 0), 1) : 0;
      heroProgress = progress;
    };
    handle();
    window.addEventListener('scroll', handle, { passive: true });
    window.addEventListener('resize', handle);
    if (stickySentinel) {
      stickyObserver = new IntersectionObserver(([entry]) => {
        showStickyCta = !entry.isIntersecting;
      }, { threshold: 0, rootMargin: '-64px 0px 0px 0px' });
      stickyObserver.observe(stickySentinel);
    }
    return () => {
      window.removeEventListener('scroll', handle);
      window.removeEventListener('resize', handle);
      stickyObserver?.disconnect();
    };
  });
</script>

<svelte:head>
  <link
    rel="preload"
    as="image"
    href={heroImageDesktopMd}
    imagesrcset={`${heroImageDesktopSm} 1400w, ${heroImageDesktopMd} 2000w, ${heroImageDesktopLg} 2800w`}
    imagesizes="(min-width: 768px) 100vw, 100vw"
    fetchpriority="high"
  />
  <link rel="preload" as="image" href={heroImageMobileLg} media="(max-width: 767px)" />
</svelte:head>


{#if !calendar}
  <p class="text-gray-500">{t('calendario.vacio')}</p>
{:else}
  <section
    class="calendar-hero u-full-bleed"
    bind:this={heroSection}
    style={`--hero-progress:${heroProgress}`}
  >
    <div class="calendar-hero__content">
      <h1 class="calendar-hero__title">{t('calendario.hero_title')}</h1>
    </div>

    <div class="calendar-video__wrap calendar-media-block" use:fadeIn={{ delay: 80 }}>
      <div class="calendar-video__media">
        <video
          playsinline
          autoplay
          muted
          loop
          preload="metadata"
        >
          {#each featureVideoSources as source (source.src)}
            {#if source.media}
              <source src={source.src} type={source.type} media={source.media} />
            {:else}
              <source src={source.src} type={source.type} />
            {/if}
          {/each}
        </video>
      </div>
    </div>

    <div class="calendar-primary__cta calendar-hero__cta" use:fadeIn={{ delay: 140 }}>
      <button
        class={`calendar-primary__button ${flash ? 'flash' : ''}`}
        type="button"
        onclick={addNow}
      >
        {ctaText}
      </button>
    </div>

    <div bind:this={stickySentinel} class="calendar-sticky-sentinel" aria-hidden="true"></div>
  </section>
  {#if showStickyCta}
    <div class="calendar-sticky-cta" transition:fade={{ duration: 260, easing: cubicOut }}>
      <button
        class={`calendar-primary__button ${flash ? 'flash' : ''}`}
        type="button"
        onclick={addNow}
      >
        {ctaText}
      </button>
    </div>
  {/if}

  <section class="calendar-primary u-full-bleed">
    <div class="u-content-wrap">
      <div class="calendar-primary__wrap">
        <div class="calendar-primary__text" use:fadeIn>
          
          <p class="calendar-primary__body">
            {#if heroSubtitleParts.lead}
              <span class="calendar-primary__drop">{heroSubtitleParts.lead}</span>{heroSubtitleParts.rest}
            {:else}
              {heroSubtitleText}
            {/if}
          </p>
        </div>
      </div>
    </div>
    <picture class="calendar-primary__media" aria-hidden="true" use:fadeIn={{ delay: 120 }}>
      <source media="(min-width: 768px)" srcset={`${highlightImageSrc} 1600w`} sizes="40vw" />
      <img class="calendar-primary__media-img" src={highlightImageSrcSmall} alt="" loading="lazy" />
    </picture>
  </section>

  <section class="calendar-story u-full-bleed" use:fadeIn>
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
  
  <section class="calendar-gallery u-full-bleed" use:fadeIn={{ delay: 100 }}>
    <picture class="calendar-gallery__picture calendar-media-block">
      <source
        media="(min-width: 1280px)"
        srcset={`${heroImageDesktopMd} 2000w, ${heroImageDesktopLg} 2800w`}
        sizes="100vw"
      />
      <source
        media="(min-width: 768px)"
        srcset={`${heroImageDesktopSm} 1400w, ${heroImageDesktopMd} 2000w`}
        sizes="100vw"
      />
      <source
        media="(min-width: 480px)"
        srcset={`${heroImageMobileSm} 900w, ${heroImageMobileLg} 1600w`}
        sizes="100vw"
      />
      <img
        class="calendar-gallery__image"
        src={heroImageMobileLg}
        srcset={`${heroImageMobileSm} 900w, ${heroImageMobileLg} 1600w`}
        sizes="100vw"
        alt={nameOf(calendar)}
        loading="eager"
        fetchpriority="high"
      />
    </picture>
  </section>
{/if}
