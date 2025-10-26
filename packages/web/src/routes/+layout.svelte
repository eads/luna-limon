<script lang="ts">
	import '../app.css';
	import { locales, getLocale, setLocale, localizeHref } from '$lib/paraglide/runtime.js';
    import { setupI18n, useI18n } from '$lib/i18n/context';
    import { page } from '$app/stores';
import { browser } from '$app/environment';
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { cart } from '$lib/cart';
import MdiCartOutline from 'virtual:icons/mdi/cart-outline';
import { PUBLIC_UMAMI_SITE_ID } from '$env/static/public';
const UMAMI_ID = PUBLIC_UMAMI_SITE_ID || '';

	let { children, data } = $props<{ children: any; data: { locale: string; messages: any } }>();
	let selected = $state(getLocale());
	let logoHref = $state(localizeHref('/'));
	let pagarHref = $state(localizeHref('/pagar'));

	// Seed per-request i18n context for SSR/CSR
	setupI18n(data.messages);

	$effect(() => {
		setLocale(selected);
		// Recompute localized hrefs when locale changes so links update reactively
		logoHref = localizeHref('/');
		pagarHref = localizeHref('/pagar');
	});

	function onLangChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const next = target.value as Locale;
		selected = next;
		try { if (browser) localStorage.setItem('preferredLocale', selected); } catch {}
		// navigate to the localized version of current path to fetch fresh SSR HTML
		goto(localizeHref(location.pathname));
	}

    const { t } = useI18n();
    const total = $derived($cart.reduce((sum, item) => sum + item.quantity, 0));
    onMount(() => {
      if (!browser) return;
      // Apply persisted language preference if present
      try {
		const stored = localStorage.getItem('preferredLocale');
		if ((stored === 'es' || stored === 'en') && stored !== selected) {
			selected = stored;
          // Avoid re-navigation on checkout/success routes to prevent perceived reloads
          if (!location.pathname.startsWith('/pagar')) {
            goto(localizeHref(location.pathname));
          }
        }
      } catch {}
    });
</script>

<svelte:head>
  <link
    rel="preload"
    href="/fonts/Elgraine-Regular.woff2"
    as="font"
    type="font/woff2"
    crossorigin="anonymous"
  />
  <link
    rel="preload"
    href="/fonts/Elgraine-Bold.woff2"
    as="font"
    type="font/woff2"
    crossorigin="anonymous"
  />
  {#if UMAMI_ID}
    <script
      defer
      src="https://cloud.umami.is/script.js"
      data-website-id={UMAMI_ID}
    ></script>
  {/if}
</svelte:head>

<nav class="sticky top-0 z-50 bg-white border-b border-black/5 py-4 px-4 shadow-[0_6px_20px_-12px_rgba(0,0,0,0.3)] relative flex items-center gap-3">
  <!-- Language toggle -->
  <div class="flex-1 flex items-center gap-1 text-[11px] font-semibold tracking-[0.1em] uppercase text-slate-600">
	{#each (locales as readonly Locale[]) as l (l)}
		<button
			class={`px-2 py-1 rounded-full border border-transparent transition ${selected === l ? 'text-[#4e4060]' : 'text-slate-400 hover:text-slate-600'}`}
			aria-pressed={selected === l}
			onclick={() => { selected = l; try { if (browser) localStorage.setItem('preferredLocale', selected); } catch {}; goto(localizeHref(location.pathname)); }}
		>{l.toUpperCase()}</button>
	{/each}
  </div>
  <!-- Centered brand logo -->
  <a
    href={logoHref}
    class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    aria-label="Luna Limón"
  >
    <img src="/logo.svg" alt="Luna Limón" class="h-[40px] md:h-[58px] mt-0" />
  </a>
  <!-- Right: cart button (hidden on pagar pages) -->
  <div class="flex-1 flex justify-end">
    {#if $page.url.pathname.startsWith('/pagar')}
      <span
        class="inline-flex h-[40px] w-[40px] md:h-[58px] md:w-[58px]"
        aria-hidden="true"
      ></span>
    {:else}
      <a
        href={pagarHref}
        class={`relative inline-flex items-center justify-center rounded-full text-white h-[40px] w-[40px] md:h-[58px] md:w-[58px] transition-transform duration-150 ease-out hover:scale-105 active:scale-95 shadow-lg ${total > 0 ? 'bg-slate-600 hover:bg-slate-700' : 'bg-slate-400 hover:bg-slate-500'}`}
        aria-label={t('carrito.finalizar_compra')}
        title={t('carrito.finalizar_compra')}
      >
        <MdiCartOutline class="text-xl md:text-2xl" />
        {#if total > 0}
          <span class="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] md:text-xs font-semibold rounded-full px-1.5 py-0.5">{total}</span>
        {/if}
      </a>
    {/if}
  </div>
</nav>

<main class="l-wrap">
	{@render children()}
</main>

<!-- Floaty language toggle (bottom-left) -->
<!-- GA is injected onMount to avoid inline variable reference issues -->
