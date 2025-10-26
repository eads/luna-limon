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
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  // @ts-expect-error - runtime types not generated yet
  import { localizeHref } from '$lib/paraglide/runtime.js';
  import { onMount } from 'svelte';
  import { getResizedImageUrl } from '$lib/utils/images';
  import './calendario.css';

  const { t } = useI18n();

  let { data } = $props<{ data: { products: Product[] } }>();
  const calendar = $derived(data.products?.[0]);
  let flash = $state(false);

  const ctaText = $derived(t('calendario.buy_simple') ?? t('calendario.buy'));

  const featureVideoSources = [
    { src: '/video/IMG_6469-mobile.webm', type: 'video/webm', media: '(max-width: 640px)' },
    { src: '/video/IMG_6472-desktop.webm', type: 'video/webm' }
  ];

  type BackgroundCard =
    | { id: string; variant: 'blank'; color: string }
    | { id: string; variant: 'quote'; heading?: string; body: string };

  const backgroundCards = $derived<BackgroundCard[]>([
    {
      id: 'intro',
      variant: 'quote',
      heading: undefined,
      body: t('calendario.hero_subtitle') ?? ''
    },
    {
      id: 'quote',
      variant: 'quote',
      heading: undefined,
      body: t('calendario.hero_subtitle') ?? ''
    },
    {
      id: 'canvas',
      variant: 'blank',
      color: 'var(--calendar-backdrop-canvas)'
    }
  ]);

  const quoteCards = $derived(backgroundCards.filter((card) => card.variant === 'quote'));

  const featuresImages = $derived([
    {
      large: getResizedImageUrl('/images/IMG_6395.jpg', 1200),
      medium: getResizedImageUrl('/images/IMG_6395.jpg', 760),
      fallback: '/images/IMG_6395.jpg'
    },
    {
      large: getResizedImageUrl('/images/IMG_6403.jpg', 1200),
      medium: getResizedImageUrl('/images/IMG_6403.jpg', 760),
      fallback: '/images/IMG_6403.jpg'
    },
    {
      large: getResizedImageUrl('/images/IMG_5882.jpg', 1200),
      medium: getResizedImageUrl('/images/IMG_5882.jpg', 760),
      fallback: '/images/IMG_5882.jpg'
    },
    {
      large: getResizedImageUrl('/images/IMG_6425.jpg', 1200),
      medium: getResizedImageUrl('/images/IMG_6425.jpg', 760),
      fallback: '/images/IMG_6425.jpg'
    }
  ]);

  const featureCards = $derived([
    {
      title: t('calendario.f1_title') ?? '',
      body: t('calendario.f1_body') ?? '',
      image: featuresImages[0]
    },
    {
      title: t('calendario.f2_title') ?? '',
      body: t('calendario.f2_body') ?? '',
      image: featuresImages[1]
    },
    {
      title: t('calendario.f3_title') ?? '',
      body: t('calendario.f3_body') ?? '',
      image: featuresImages[2]
    },
    {
      title: t('calendario.f4_title') ?? '',
      body: t('calendario.f4_body') ?? '',
      image: featuresImages[3]
    }
  ]);

  const renderRich = (input: string | undefined) => {
    if (!input) return '';
    let html = input.replace(/\r\n?/g, '\n');
    html = html.replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/gs, '<strong>$1</strong>');
    html = html.replace(/\*(\S[^*]*?\S)\*/g, '<em>$1</em>');
    html = html.replace(/_(\S[^_]*?\S)_/g, '<em>$1</em>');
    html = html.replace(/\\([*_])/g, '$1');
    html = html.replace(/\n{2,}/g, '<br /><br />');
    html = html.replace(/\n/g, '<br />');
    return html;
  };

  let activeCard = $state('');

  let observer: IntersectionObserver | undefined;
  let heroCtaEl: HTMLDivElement | null = null;
  let bottomSection: HTMLElement | null = null;
  let stickyVisible = $state(false);
  const registeredSections = new Set<HTMLElement>();

  function layerTrigger(node: HTMLElement, cardId: string) {
    node.dataset.cardId = cardId;
    registeredSections.add(node);
    if (browser && observer) {
      observer.observe(node);
    }
    return {
      update(nextId: string) {
        node.dataset.cardId = nextId;
        if (browser) {
          refreshActiveCard();
        }
      },
      destroy() {
        registeredSections.delete(node);
        if (browser && observer) {
          observer.unobserve(node);
        }
        delete node.dataset.cardId;
      }
    };
  }

  function refreshActiveCard() {
    if (!browser) return;
    let bestId: string | null = null;
    let bestScore = 0;
    const viewportHeight = window.innerHeight || 1;
    const coverageTop = viewportHeight * 0.2;
    const coverageBottom = viewportHeight * 0.9;

    registeredSections.forEach((node) => {
      const rect = node.getBoundingClientRect();
      const overlap = Math.max(
        Math.min(rect.bottom, coverageBottom) - Math.max(rect.top, coverageTop),
        0
      );
      if (overlap > bestScore) {
        bestScore = overlap;
        const id = node.dataset.cardId;
        if (id) {
          bestId = id;
        }
      }
    });
    if (bestId && bestId !== activeCard) {
      activeCard = bestId;
    }
    if (!bestId && activeCard) {
      activeCard = '';
    }
  }

  onMount(() => {
    if (!browser) return;
    const updateStickyState = () => {
      if (!browser) return;
      const ref = heroCtaEl ?? undefined;
      const refRect = ref?.getBoundingClientRect();
      stickyVisible = !!refRect && refRect.bottom < 0;
    };

    const handle = () => {
      refreshActiveCard();
      updateStickyState();
    };

    observer = new IntersectionObserver(() => {
      refreshActiveCard();
    }, { threshold: [0.2, 0.5, 0.8] });

    registeredSections.forEach((node) => observer?.observe(node));
    handle();

    const handleResize = () => handle();
    const handleScroll = () => updateStickyState();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer?.disconnect();
      observer = undefined;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  });

  $effect(() => {
    const fallback = backgroundCards[0]?.id;
    if (!activeCard && fallback) {
      activeCard = fallback;
      if (browser) {
        refreshActiveCard();
      }
      return;
    }
    if (activeCard && !backgroundCards.some((card) => card.id === activeCard) && fallback) {
      activeCard = fallback;
      if (browser) {
        refreshActiveCard();
      }
    }
  });

  function addNow() {
    if (!calendar) return;
    cart.add(calendar, 1);
    flash = true;
    setTimeout(() => (flash = false), 700);
    goto(localizeHref('/pagar'));
  }
</script>

{#if !calendar}
  <p class="calendar-empty">{t('calendario.vacio')}</p>
{:else}
  <div class="calendar-layered u-full-bleed">
    <div class="calendar-layered__background" aria-hidden="true">
      {#each backgroundCards as card (card.id)}
        <section
          class={`calendar-background-card calendar-background-card--${card.variant} ${activeCard === card.id ? 'is-active' : ''}`}
          data-card-id={card.id}
          style={card.variant === 'blank' ? `--card-color:${card.color}` : undefined}
        >
        </section>
      {/each}
    </div>

    <div class="calendar-layered__quotes">
      {#each quoteCards as card (card.id)}
        <section
          class={`calendar-quote-card ${activeCard === card.id ? 'is-active' : ''}`}
          data-card-id={card.id}
        >
          {#if card.heading}
            <span class="calendar-quote-card__eyebrow">{card.heading}</span>
          {/if}
          <p class="calendar-quote-card__text">{@html renderRich(card.body)}</p>
        </section>
      {/each}
    </div>

    <div class="calendar-layered__content">
      <section class="calendar-hero" use:layerTrigger={'intro'}>
        <div class="calendar-hero__frame">
          <video class="calendar-hero__video" playsinline autoplay muted loop preload="metadata">
            {#each featureVideoSources as source (source.src)}
              {#if source.media}
                <source src={source.src} type={source.type} media={source.media} />
              {:else}
                <source src={source.src} type={source.type} />
              {/if}
            {/each}
          </video>
          <div class="calendar-hero__overlay">
            <h1 class="calendar-hero__title">{@html renderRich(t('calendario.hero_title'))}</h1>
            <div class="calendar-hero__cta" bind:this={heroCtaEl}>
              <button
                class={`calendar-primary__button ${flash ? 'flash' : ''}`}
                type="button"
                onclick={addNow}
              >
                {ctaText}
              </button>
              <a
                class="calendar-hero__follow"
                href="https://www.instagram.com/lunalimon.co"
                target="_blank"
                rel="noreferrer"
              >
                <i class="ri-instagram-line" aria-hidden="true"></i>
                <span>@lunalimon.co</span>
              </a>
            </div>
            <div class="calendar-hero__scroll" aria-hidden="true">
              <svg class="calendar-hero__scroll-icon" viewBox="0 0 24 16" width="24" height="16">
                <path d="M4.47 4.47a1 1 0 0 1 1.41 0L12 10.59l6.12-6.12a1 1 0 1 1 1.41 1.41l-6.82 6.83a1 1 0 0 1-1.41 0L4.47 5.88a1 1 0 0 1 0-1.41Z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section class="calendar-section calendar-section--swatches" use:layerTrigger={'quote'}>
        <div class="calendar-swatches" aria-hidden="true">
          <div class="calendar-swatches__box calendar-swatches__box--one"></div>
          <div class="calendar-swatches__box calendar-swatches__box--two calendar-swatches__box--under"></div>
          <div class="calendar-swatches__box calendar-swatches__box--three"></div>
          <div class="calendar-swatches__box calendar-swatches__box--four"></div>
          <div class="calendar-swatches__box calendar-swatches__box--five calendar-swatches__box--under"></div>
          <div class="calendar-swatches__box calendar-swatches__box--six"></div>
        </div>
      </section>

      <section class="calendar-section calendar-section--details" bind:this={bottomSection} use:layerTrigger={'canvas'}>
        <div class="calendar-section__surface">
          <div class="calendar-section__inner">
            <div class="calendar-features">
            <div class="calendar-features__grid">
              {#each featureCards as card, index}
                <article class={`calendar-feature ${index % 2 ? 'is-alt' : ''}`}>
                  <picture class="calendar-feature__media">
                    <source
                      media="(min-width: 900px)"
                      srcset={`${card.image.large} 1200w, ${card.image.medium} 800w`}
                      sizes="50vw"
                    />
                    <source
                      media="(min-width: 480px)"
                      srcset={`${card.image.medium} 800w, ${card.image.large} 1200w`}
                      sizes="90vw"
                    />
                    <img
                      src={card.image.fallback}
                      srcset={`${card.image.medium} 800w, ${card.image.large} 1200w`}
                      sizes="90vw"
                      alt={card.title}
                      loading="lazy"
                    />
                  </picture>
                  <div class="calendar-feature__text">
                    <h3>{@html renderRich(card.title)}</h3>
                    <p>{@html renderRich(card.body)}</p>
                  </div>
                </article>
              {/each}
            </div>
              <div class="calendar-features__cta">
                <a
                  class="calendar-features__social"
                  href="https://www.instagram.com/lunalimon.co"
                  target="_blank"
                  rel="noreferrer"
                >
                  <i class="ri-instagram-line" aria-hidden="true"></i>
                  <span>{t('calendario.follow_cta')}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
  {#if stickyVisible}
    <div class="calendar-sticky-cta">
      <button
        class={`calendar-primary__button calendar-primary__button--wide ${flash ? 'flash' : ''}`}
        type="button"
        onclick={addNow}
      >
        {ctaText}
      </button>
    </div>
  {/if}
{/if}
