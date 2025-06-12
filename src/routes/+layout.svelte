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

<nav class="bg-white/90 backdrop-blur border-b p-4 flex justify-between items-center shadow">
	<a href="/" class="text-xl font-semibold">Luna Limón</a>
	<div class="relative">
		<select
			class="border rounded p-1 pr-6 text-sm w-24 appearance-none"
			bind:value={selected}
			onchange={switchLang}
		>
			{#each locales as l (l)}
				<option value={l}>{l.toUpperCase()}</option>
			{/each}
		</select>
		<svg
			class="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-700"
			fill="currentColor"
			viewBox="0 0 20 20"
		>
			<path
				fill-rule="evenodd"
				d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
				clip-rule="evenodd"
			/>
		</svg>
	</div>
</nav>

<main class="container mx-auto p-4">
	{@render children()}
</main>
<FloatyCart />
