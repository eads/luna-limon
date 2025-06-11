<script lang="ts">
	import { cart } from '$lib/cart';
	$: items = $cart;
</script>

<h1>Cart</h1>
{#if items.length}
	<ul>
		{#each items as { product, quantity } (product.id)}
			<li>{product.name} x{quantity}</li>
		{/each}
	</ul>
	<a href="/checkout">Checkout</a>
{:else}
	<p>Cart is empty</p>
{/if}
