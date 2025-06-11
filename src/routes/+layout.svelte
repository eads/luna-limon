<script lang="ts">
	import '../app.css';
	import FloatyCart from '$lib/FloatyCart.svelte';
	let { children } = $props();
</script>

<main class="container mx-auto p-4">
	{@render children()}
</main>
<FloatyCart />
