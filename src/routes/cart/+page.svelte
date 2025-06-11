<script lang="ts">
	import { cart } from '$lib/cart';
	$: items = $cart;
</script>

<h1 class="text-2xl font-bold mb-4">Cart</h1>
{#if items.length}
	<ul class="space-y-2">
		{#each items as { product, quantity } (product.id)}
			<li class="flex justify-between border-b pb-1">
				<span>{product.name}</span>
				<span>x{quantity}</span>
			</li>
		{/each}
	</ul>
	<a href="/checkout" class="mt-4 inline-block text-blue-600 underline">Checkout</a>
{:else}
	<p>Cart is empty</p>
{/if}
