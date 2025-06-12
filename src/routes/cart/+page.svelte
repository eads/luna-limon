<script lang="ts">
	import { cart } from '$lib/cart';
	$: items = $cart;
	$: total = items.reduce((sum, i) => sum + i.product.precio * i.quantity, 0);
</script>

<h1 class="text-2xl font-bold mb-4">Cart</h1>
{#if items.length}
	<ul class="space-y-4">
		{#each items as { product, quantity } (product.id)}
			<li class="flex items-center gap-4 border-b pb-4">
				{#if product.imagen}
					<img src={product.imagen} alt={product.nombre} class="w-16 h-16 object-cover rounded" />
				{/if}
				<div class="flex-1">
					<p class="font-medium">{product.nombre}</p>
					<p class="text-sm text-gray-600">${product.precio} x {quantity}</p>
				</div>
				<p class="font-medium">${product.precio * quantity}</p>
			</li>
		{/each}
	</ul>
	<p class="mt-4 font-semibold">Total: ${total}</p>
	<div class="mt-4 flex gap-4">
		<a href="/checkout" class="rounded bg-green-600 text-white py-2 px-4">Checkout</a>
		<button class="text-red-600 underline text-sm" on:click={() => cart.clear()}>
			Reset cart
		</button>
	</div>
{:else}
	<p>Cart is empty</p>
{/if}
