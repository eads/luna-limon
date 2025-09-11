<script lang="ts">
	import { cart, type Product } from '$lib/cart';
	import { useI18n } from '$lib/i18n/context';
	const { t } = useI18n();
    // locale-based selectors for product fields
    // @ts-expect-error - runtime types not generated yet
    import { getLocale } from '$lib/paraglide/runtime.js';
    const nameOf = (p: Product) => p.nombre[getLocale() as 'es'|'en'] ?? p.nombre.es ?? p.nombre.en ?? '';
	const items = $derived($cart);
	const total = $derived(items.reduce((sum, i) => sum + i.product.precio * i.quantity, 0));
</script>

<h1 class="text-2xl font-bold mb-4">{t('carrito_label')}</h1>
{#if items.length}
	<ul class="space-y-4">
		{#each items as { product, quantity } (product.id)}
			<li class="flex items-center gap-4 border-b pb-4">
				{#if product.imagen}
					<img
						src={product.imagen}
						alt={nameOf(product)}
						class="w-24 h-24 object-cover rounded-md"
					/>
				{/if}
            <div class="flex-1">
                <p class="font-medium">{nameOf(product)}</p>
                <p class="text-sm text-gray-600">${product.precio} x {quantity}</p>
            </div>
				<p class="font-medium">${product.precio * quantity}</p>
			</li>
		{/each}
	</ul>
	<p class="mt-4 font-semibold">{t('carrito_total')} ${total}</p>
	<div class="mt-4 flex gap-4">
		<a href="/pagar" class="rounded bg-green-600 text-white py-2 px-4">{t('finalizar_compra')}</a>
		<button class="text-red-600 underline text-sm" onclick={() => cart.clear()}>
			{t('carrito_vacio')}
		</button>
	</div>
{:else}
	<p>{t('carrito_vacio')}</p>
{/if}
