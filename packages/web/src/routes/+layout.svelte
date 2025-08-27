<script lang="ts">
	import '../app.css';
	import FloatyCart from '$lib/FloatyCart.svelte';
	// @ts-expect-error - runtime types not generated yet
	import { locales, getLocale, setLocale, localizeHref } from '$lib/paraglide/runtime.js';
	import { setupI18n } from '$lib/i18n/context';
  import { goto } from '$app/navigation';

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

  
</script>

<nav class="bg-white/90 backdrop-blur border-b p-4 flex justify-between items-center shadow">
	<a href="/" class="text-xl font-semibold">Luna Limón</a>
	<div class="relative">
		<select
			class="border rounded p-1 pr-6 text-sm w-13 appearance-none"
			bind:value={selected}
			onchange={onLangChange}
		>
			{#each locales as l (l)}
				<option value={l}>{l.toUpperCase()}</option>
			{/each}
		</select>
	</div>
</nav>

<main class="container mx-auto p-4">
	{@render children()}
</main>

<FloatyCart />
