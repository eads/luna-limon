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
      variant: 'blank',
      color: '#fef6ef'
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
      color: '#fdecef'
    }
  ]);

  let activeCard = $state('');

  let observer: IntersectionObserver | undefined;
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
    observer = new IntersectionObserver(() => {
      refreshActiveCard();
    }, { threshold: [0.2, 0.5, 0.8] });

    registeredSections.forEach((node) => observer?.observe(node));
    refreshActiveCard();

    const handleResize = () => refreshActiveCard();
    window.addEventListener('resize', handleResize);

    return () => {
      observer?.disconnect();
      observer = undefined;
      window.removeEventListener('resize', handleResize);
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
          style={card.variant === 'blank' ? `--card-color:${card.color}` : undefined}
        >
          {#if card.variant === 'blank'}
            <!-- blank card just sets the backdrop color -->
          {:else if card.variant === 'quote'}
            <div class="calendar-background-card__viewport">
              {#if card.heading}
                <span class="calendar-background-card__eyebrow">{card.heading}</span>
              {/if}
              <p class="calendar-background-card__text">{card.body}</p>
            </div>
          {/if}
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
            <h1 class="calendar-hero__title">{t('calendario.hero_title')}</h1>
            <div class="calendar-hero__cta">
              <button
                class={`calendar-primary__button ${flash ? 'flash' : ''}`}
                type="button"
                onclick={addNow}
              >
                {ctaText}
              </button>
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
        </div>
      </section>

      <section class="calendar-section calendar-section--details" use:layerTrigger={'canvas'}>
        <div class="calendar-section__surface">
          <div class="calendar-section__inner">
            <div class="calendar-features">
              <picture class="calendar-features__media">
                <source srcset="/images/IMG_6395.jpg" />
                <img src="/images/IMG_6395.jpg" alt={t('calendario.titulo')} loading="lazy" />
              </picture>
              <div class="calendar-features__grid">
                <div class="calendar-features__item">
                  <h3>{t('calendario.f1_title')}</h3>
                  <p>{t('calendario.f1_body')}</p>
                </div>
                <div class="calendar-features__item">
                  <h3>{t('calendario.f2_title')}</h3>
                  <p>{t('calendario.f2_body')}</p>
                </div>
                <div class="calendar-features__item">
                  <h3>{t('calendario.f3_title')}</h3>
                  <p>{t('calendario.f3_body')}</p>
                </div>
                <div class="calendar-features__item">
                  <h3>{t('calendario.f4_title')}</h3>
                  <p>{t('calendario.f4_body')}</p>
                </div>
              </div>
              <div class="calendar-features__cta">
                <button
                  class={`calendar-primary__button ${flash ? 'flash' : ''}`}
                  type="button"
                  onclick={addNow}
                >
                  {ctaText}
                </button>
                <div class="calendar-features__follow">
                  <a
                    class="calendar-features__link"
                    href="https://www.instagram.com/lunalimon.co"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('calendario.follow_cta')}
                  </a>
                  <span class="calendar-features__handle">{t('calendario.follow_handle')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
{/if}
