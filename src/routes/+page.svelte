<!-- +page.svelte -->
<script lang="ts">
	import type { Product } from '$lib/server/catalog';
	import { cart } from '$lib/cart';
	import { m } from '$lib/paraglide/messages';
	import { getResizedImageUrl } from '$lib/utils/images';
	import { onMount } from 'svelte';
	
	export let data: { products: Product[] };
	let added = new Set<string>();
	let quantities: Record<string, number> = {};
	
	onMount(() => {
		for (const p of data.products) {
			quantities[p.id] = 1;
		}
	});
	
	function handleAdd(product: Product) {
		const qty = quantities[product.id] ?? 1;
		cart.add(product, qty);
		added.add(product.id);
		added = new Set(added);
		setTimeout(() => {
			added.delete(product.id);
			added = new Set(added);
		}, 800);
	}
</script>

<h1 class="text-2xl font-bold mb-4">{m.etiqueta_catalogo()}</h1>
<ul class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.products as product (product.id)}
		<li class="border rounded-lg shadow-md p-4 flex flex-col gap-2 bg-white">
			{#if product.imagen}
				<img
					src={getResizedImageUrl(product.imagen, 400)}
					alt={product.nombre}
					class="w-full h-48 object-cover rounded-md"
					loading="lazy"
				/>
			{/if}
			<h2 class="font-semibold text-lg">{product.nombre}</h2>
			<p class="text-sm text-gray-700">{product.descripción}</p>
			<p class="font-medium">${product.precio}</p>
			<input
				type="number"
				min="1"
				class="w-20 border rounded p-1 text-sm"
				bind:value={quantities[product.id]}
			/>
			<button
				class={`mt-auto rounded text-white py-1 px-2 text-sm ${added.has(product.id) ? 'bg-green-600' : 'bg-blue-600'}`}
				on:click={() => handleAdd(product)}
			>
				{#if added.has(product.id)}
					{m.agregado_label()}
				{:else}
					{m.agrega_label()}
				{/if}
			</button>
		</li>
	{/each}
</ul>