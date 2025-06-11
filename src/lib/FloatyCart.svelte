<script lang="ts">
	import { cart } from '$lib/cart';
	$: total = $cart.reduce((sum, item) => sum + item.quantity, 0);
</script>

<a
	href="/cart"
	class="fixed bottom-4 right-4 bg-blue-600 text-white rounded-full px-4 py-2 shadow-lg flex items-center gap-1"
	aria-label="Cart"
>
	<span>🛒</span>
	<span>{total}</span>
</a>
