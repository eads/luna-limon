<!-- +page.svelte -->
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
	const { t } = useI18n();
	import { getResizedImageUrl } from '$lib/utils/images';
import { onMount } from 'svelte';
	
	let { data } = $props<{ data: { products: Product[] } }>();
	// current locale used to pick fields inline
	// @ts-expect-error - runtime types not generated yet
	import { getLocale } from '$lib/paraglide/runtime.js';
	const nameOf = (p: Product) => p.nombre[getLocale() as 'es'|'en'] ?? p.nombre.es ?? p.nombre.en ?? '';
	const descOf = (p: Product) => p.descripción[getLocale() as 'es'|'en'] ?? p.descripción.es ?? p.descripción.en ?? '';
let added = $state(new Set<string>());
let quantities: Record<string, number> = {};
// Initialize default quantities to 1 immediately to avoid SSR/mount mismatch
for (const p of data.products) {
  if (quantities[p.id] == null) quantities[p.id] = 1;
}
	
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

<h1 class="text-2xl font-bold mb-4">{t('etiqueta_catalogo')}</h1>
<ul class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.products as product (product.id)}
		<li class="border rounded-lg shadow-md p-4 flex flex-col gap-2 bg-white">
			{#if product.imagen}
				<img
					src={getResizedImageUrl(product.imagen, 400)}
					alt={nameOf(product)}
					class="w-full h-48 object-cover rounded-md"
					loading="lazy"
				/>
			{/if}
            <h2 class="font-semibold text-lg">{nameOf(product)}</h2>
            <p class="text-sm text-gray-700">{descOf(product)}</p>
			<p class="font-medium">${product.precio}</p>
			<input
				type="number"
				min="1"
				class="w-20 border rounded p-1 text-sm"
				bind:value={quantities[product.id]}
			/>
			<button
				class={`mt-auto rounded text-white py-1 px-2 text-sm ${added.has(product.id) ? 'bg-green-600' : 'bg-blue-600'}`}
				onclick={() => handleAdd(product)}
			>
				{#if added.has(product.id)}
					{t('agregado_label')}
				{:else}
					{t('agrega_label')}
				{/if}
			</button>
		</li>
	{/each}
</ul>
