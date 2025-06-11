<script lang="ts">
	import '../app.css';
	import FloatyCart from '$lib/FloatyCart.svelte';
	let { children } = $props();
</script>

<nav class="bg-gray-100 border-b p-4">
	<a href="/" class="text-xl font-semibold">Luna Limón</a>
</nav>

<main class="container mx-auto p-4">
	{@render children()}
</main>
<FloatyCart />
