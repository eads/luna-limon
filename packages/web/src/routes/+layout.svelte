<script lang="ts">
	import '../app.css';
	// @ts-expect-error - runtime types not generated yet
	import { locales, getLocale, setLocale, localizeHref } from '$lib/paraglide/runtime.js';
    import { setupI18n, useI18n } from '$lib/i18n/context';
    import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { cart } from '$lib/cart';
  import MdiCartOutline from 'virtual:icons/mdi/cart-outline';

	let { children, data } = $props<{ children: any; data: { locale: string; messages: any } }>();
	let selected = $state(getLocale());

	// Seed per-request i18n context for SSR/CSR
	setupI18n(data.messages);

	$effect(() => {
		setLocale(selected);
	});

	function onLangChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const next = target.value;
		selected = next;
		// navigate to the localized version of current path to fetch fresh SSR HTML
		goto(localizeHref(location.pathname));
	}

    const { t } = useI18n();
    const total = $derived($cart.reduce((sum, item) => sum + item.quantity, 0));
</script>

<nav class="sticky top-0 z-50 bg-white/90 backdrop-blur border-b p-3 pr-20 shadow relative">
	<!-- Left: language selector -->
	<div class="flex items-center">
		<select
			class="text-base text-gray-700 bg-white/70 border border-gray-300 rounded px-2 py-1 w-16 appearance-none"
			bind:value={selected}
			onchange={onLangChange}
		>
			{#each locales as l (l)}
				<option value={l}>{l.toUpperCase()}</option>
			{/each}
		</select>
	</div>

	<!-- Center: brand (swap for logo when ready) -->
	<a href="/" class="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 text-xl font-semibold">Luna Limón</a>

	{#if !$page.url.pathname.includes('/pagar')}
		<a
			href={localizeHref('/pagar')}
			class="absolute -bottom-6 right-4 inline-flex items-center justify-center rounded-full bg-slate-600 text-white w-16 h-16 hover:bg-slate-700 transition-transform duration-150 ease-out hover:scale-105 active:scale-95 shadow-lg"
			aria-label={t('finalizar_compra')}
			title={t('finalizar_compra')}
		>
			<MdiCartOutline class="text-3xl" />
			{#if total > 0}
				<span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-0.5">{total}</span>
			{/if}
		</a>
	{:else}
		<!-- Disabled cart on checkout page, matching overflow style with badge -->
		<button
			class="absolute -bottom-6 right-4 inline-flex items-center justify-center rounded-full bg-gray-300 text-gray-600 w-16 h-16 shadow-lg cursor-not-allowed"
			aria-disabled="true"
			title={t('finalizar_compra')}
		>
			<MdiCartOutline class="text-3xl" />
			{#if total > 0}
				<span class="absolute -top-1 -right-1 bg-gray-400 text-white text-xs font-semibold rounded-full px-2 py-0.5">{total}</span>
			{/if}
		</button>
	{/if}
</nav>

<main class="container mx-auto px-4">
	{@render children()}
</main>
