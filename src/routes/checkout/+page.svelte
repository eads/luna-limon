<script lang="ts">
	import { cart } from '$lib/cart';
	import { goto } from '$app/navigation';

	let phone = '';

	async function placeOrder() {
		const res = await fetch('/api/order', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ phone, items: $cart })
		});
		const data = await res.json();
		cart.clear();
		if (data.checkoutUrl) {
			window.location.href = data.checkoutUrl;
		} else {
			goto('/');
		}
	}
</script>

<h1 class="text-2xl font-bold mb-4">Checkout</h1>
<input class="mb-2 w-full rounded border p-2" bind:value={phone} placeholder="WhatsApp number" />
<button class="rounded bg-green-600 text-white py-2 px-4" on:click={placeOrder}>
	Place order
</button>
