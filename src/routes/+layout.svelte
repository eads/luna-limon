<script lang="ts">
	import '../app.css';
	import FloatyCart from '$lib/components/FloatyCart.svelte';
	// @ts-expect-error - runtime types not generated yet
	import { locales, getLocale, setLocale } from '$lib/paraglide/runtime.js';

	let { children } = $props();
	let selected = getLocale();
	const switchLang = (e: Event) => {
		const target = e.target as HTMLSelectElement;
		setLocale(target.value);
	};
</script>

<nav class="bg-white/90 backdrop-blur border-b p-4 flex justify-between items-center shadow">
	<a href="/" class="text-xl font-semibold">Luna Limón</a>
	<div class="relative">
		<select
			class="border rounded p-1 pr-6 text-sm w-13 appearance-none"
			bind:value={selected}
			onchange={switchLang}
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
