<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { cart } from '$lib/cart';
	import { localizeHref } from '$lib/paraglide/runtime';
	import MdiCartOutline from 'virtual:icons/mdi/cart-outline';
	$: total = $cart.reduce((sum, item) => sum + item.quantity, 0);
</script>

<a
	href={localizeHref("/carrito")}
	class="fixed bottom-5 right-5 bg-slate-600 text-xl text-white rounded-full px-4 py-2 drop-shadow-xl/50 flex items-center gap-1"
	aria-label="{m.carrito_label()}"
>
	<MdiCartOutline />
	<span>{m.finalizar_compra() }({total})</span>
</a>
