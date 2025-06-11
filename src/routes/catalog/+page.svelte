<script lang="ts">
	import type { Product } from '$lib/server/catalog';
	import { cart } from '$lib/cart';
	export let data: { products: Product[] };
	console.log(data);
</script>

<h1>Catalog</h1>
<ul>
	{#each data.products as product (product.id)}
		<li class="mb-4">
			<h2>{product.nombre}</h2>
			<p>{product.descripción}</p>
			<p>{product.precio}</p>
			<button on:click={() => cart.add(product)}>Add</button>
		</li>
	{/each}
</ul>
<a href="/cart">Go to cart</a>
