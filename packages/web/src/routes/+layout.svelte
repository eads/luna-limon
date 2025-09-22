<script lang="ts">
	import '../app.css';
	// @ts-expect-error - runtime types not generated yet
	import { locales, getLocale, setLocale, localizeHref } from '$lib/paraglide/runtime.js';
    import { setupI18n, useI18n } from '$lib/i18n/context';
    import { page } from '$app/stores';
    import { browser } from '$app/environment';
    import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { cart } from '$lib/cart';
  import MdiCartOutline from 'virtual:icons/mdi/cart-outline';

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
        const next = target.value;
        selected = next;
        try { if (browser) localStorage.setItem('preferredLocale', selected); } catch {}
        // navigate to the localized version of current path to fetch fresh SSR HTML
        goto(localizeHref(location.pathname));
    }

    const { t } = useI18n();
    const total = $derived($cart.reduce((sum, item) => sum + item.quantity, 0));
    let langVisible = $state(true);
    function handleScroll() {
      if (!browser) return;
      langVisible = (window.scrollY || 0) < 60;
    }
    onMount(() => {
      if (!browser) return;
      handleScroll();
      window.addEventListener('scroll', handleScroll, { passive: true });
      // Apply persisted language preference if present
      try {
        const stored = localStorage.getItem('preferredLocale');
        if (stored && stored !== selected) {
          selected = stored;
          goto(localizeHref(location.pathname));
        }
      } catch {}
    });
    onDestroy(() => { if (browser) window.removeEventListener('scroll', handleScroll); });
</script>

<nav class="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-black/5 py-4 pl-4 pr-4 shadow-[0_6px_20px_-12px_rgba(0,0,0,0.3)] relative flex items-center justify-between">
	<!-- Left: brand logo (embiggened) -->
	<a href={logoHref} class="inline-block" aria-label="Luna Limón">
		<img src="/logo.svg" alt="Luna Limón" class="h-[34px] md:h-[46px] mt-[1px]" />
	</a>

	{#if !$page.url.pathname.includes('/pagar')}
				<a
					href={pagarHref}
					class={`relative inline-flex items-center justify-center rounded-full text-white h-[34px] w-[34px] md:h-[46px] md:w-[46px] transition-transform duration-150 ease-out hover:scale-105 active:scale-95 shadow-lg ${total > 0 ? 'bg-slate-600 hover:bg-slate-700' : 'bg-slate-400 hover:bg-slate-500'}`}
					aria-label={t('finalizar_compra')}
					title={t('finalizar_compra')}
				>
					<MdiCartOutline class="text-lg md:text-xl" />
					{#if total > 0}
						<span class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] md:text-xs font-semibold rounded-full px-1.5 py-0.5">{total}</span>
					{/if}
				</a>
		{:else}
			<!-- Disabled cart on checkout page, inline and aligned with logo -->
				<button
					class="relative inline-flex items-center justify-center rounded-full bg-gray-300 text-gray-600 h-[34px] w-[34px] md:h-[46px] md:w-[46px] shadow-lg cursor-not-allowed"
					aria-disabled="true"
					title={t('finalizar_compra')}
				>
					<MdiCartOutline class="text-lg md:text-xl" />
					{#if total > 0}
						<span class="absolute -top-1 -right-1 bg-gray-400 text-white text-[10px] md:text-xs font-semibold rounded-full px-1.5 py-0.5">{total}</span>
					{/if}
				</button>
		{/if}
</nav>

<main class="l-wrap">
	{@render children()}
</main>

<!-- Floaty language toggle (bottom-left) -->
{#if !$page.url.pathname.includes('/pagar')}
<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-opacity duration-150" style={`opacity:${langVisible ? 1 : 0}; pointer-events:${langVisible ? 'auto' : 'none'}`}>
  <div class="bg-slate-600/95 text-white backdrop-blur-md rounded-full shadow-2xl ring-1 ring-black/20 px-2.5 py-1.5 flex items-center gap-1.5">
    {#each ['es','en'] as l (l)}
      <button
        class={`px-3.5 py-1.5 text-sm rounded-full transition ${selected === l ? 'bg-white/20 shadow-inner' : 'bg-transparent hover:bg-white/10'}`}
        aria-pressed={selected === l}
        onclick={() => { selected = l; try { if (browser) localStorage.setItem('preferredLocale', selected); } catch {}; goto(localizeHref(location.pathname)); }}
      >{l.toUpperCase()}</button>
    {/each}
  </div>
</div>
{/if}
