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

<h1>Checkout</h1>
<input bind:value={phone} placeholder="WhatsApp number" />
<button on:click={placeOrder}>Place order</button>
