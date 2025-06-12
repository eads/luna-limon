<script lang="ts">
	import '../app.css';
	import FloatyCart from '$lib/FloatyCart.svelte';
	// @ts-expect-error - runtime types not generated yet
	import { locales, getLocale, setLocale } from '$lib/paraglide/runtime.js';

	let { children } = $props();
	let selected = getLocale();
	const switchLang = (e: Event) => {
		const target = e.target as HTMLSelectElement;
		setLocale(target.value);
	};
</script>

<nav class="bg-gray-100 border-b p-4 flex justify-between items-center">
	<a href="/" class="text-xl font-semibold">Luna Limón</a>
	<select class="border rounded p-1 text-sm" bind:value={selected} on:change={switchLang}>
		{#each locales as l (l)}
			<option value={l}>{l.toUpperCase()}</option>
		{/each}
	</select>
</nav>

<main class="container mx-auto p-4">
	{@render children()}
</main>
<FloatyCart />
