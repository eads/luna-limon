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
    | { id: string; variant: 'quote'; heading?: string; body: string }
    | { id: string; variant: 'affirmation'; heading?: string; lines: string[] };

  const backgroundCards = $derived<BackgroundCard[]>([
    {
      id: 'intro',
      variant: 'blank',
      color: '#fef6ef'
    },
    {
      id: 'quote',
      variant: 'quote',
      heading: t('calendario.hero_eyebrow') ?? '',
      body: t('calendario.hero_subtitle') ?? ''
    },
    {
      id: 'affirmation',
      variant: 'affirmation',
      heading: t('calendario.hero_eyebrow') ?? '',
      lines: [
        t('calendario.story_point_1') ?? '',
        t('calendario.story_point_2') ?? '',
        t('calendario.story_point_3') ?? ''
      ]
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
    let bestVisible = 0;
    const viewportHeight = window.innerHeight || 1;
    registeredSections.forEach((node) => {
      const rect = node.getBoundingClientRect();
      const visible = Math.max(Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0), 0);
      if (visible > bestVisible) {
        bestVisible = visible;
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
        >
          {#if card.variant === 'blank'}
            <div class="calendar-background-card__swatch" style={`--card-color:${card.color}`}></div>
          {:else if card.variant === 'quote'}
            <div class="calendar-background-card__viewport">
              {#if card.heading}
                <span class="calendar-background-card__eyebrow">{card.heading}</span>
              {/if}
              <p class="calendar-background-card__text">{card.body}</p>
            </div>
          {:else if card.variant === 'affirmation'}
            <div class="calendar-background-card__viewport calendar-background-card__viewport--affirmation">
              {#if card.heading}
                <span class="calendar-background-card__eyebrow">{card.heading}</span>
              {/if}
              <div class="calendar-background-card__mantras">
                {#each card.lines as line, index (index)}
                  <p class="calendar-background-card__mantra">{line}</p>
                {/each}
              </div>
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
            <span class="calendar-hero__eyebrow">{t('calendario.hero_eyebrow')}</span>
            <h1 class="calendar-hero__title">{t('calendario.hero_title')}</h1>
            <div class="calendar-hero__cta">
              <button
                class={`calendar-primary__button ${flash ? 'flash' : ''}`}
                type="button"
                onclick={addNow}
              >
                {ctaText}
              </button>
              <p class="calendar-hero__note">{t('calendario.preorder')}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="calendar-section calendar-section--swatches" use:layerTrigger={'quote'}>
        <div class="calendar-swatches" aria-hidden="true">
          <div class="calendar-swatches__box calendar-swatches__box--one"></div>
          <div class="calendar-swatches__box calendar-swatches__box--two"></div>
          <div class="calendar-swatches__box calendar-swatches__box--three"></div>
          <div class="calendar-swatches__box calendar-swatches__box--four"></div>
          <div class="calendar-swatches__box calendar-swatches__box--five"></div>
          <div class="calendar-swatches__box calendar-swatches__box--six"></div>
        </div>
      </section>

      <section class="calendar-section calendar-section--story" use:layerTrigger={'affirmation'}>
        <div class="calendar-section__surface">
          <div class="calendar-section__inner calendar-section__inner--narrow">
            <span class="calendar-story__eyebrow">{t('calendario.story_placeholder_label')}</span>
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

      <section class="calendar-section calendar-section--details" use:layerTrigger={'affirmation'}>
        <div class="calendar-section__surface">
          <div class="calendar-section__inner">
            <div class="calendar-features">
              <h2 class="calendar-features__title">{t('calendario.titulo')}</h2>
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
