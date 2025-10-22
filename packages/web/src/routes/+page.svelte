<!-- +page.svelte -->
<script lang="ts">
	type Product = {
		id: string;
		nombre: { es?: string; en?: string };
		descripción: { es?: string; en?: string };
		precio: number;
		imagen?: string;
	};
	import { cart } from '$lib/cart';
	import { useI18n } from '$lib/i18n/context';
	const { t } = useI18n();
	import { getResizedImageUrl } from '$lib/utils/images';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	
	let { data } = $props<{ data: { products: Product[] } }>();
	// current locale used to pick fields inline
	// @ts-expect-error - runtime types not generated yet
	import { getLocale } from '$lib/paraglide/runtime.js';
	const nameOf = (p: Product) => p.nombre[getLocale() as 'es'|'en'] ?? p.nombre.es ?? p.nombre.en ?? '';
	const descOf = (p: Product) => p.descripción[getLocale() as 'es'|'en'] ?? p.descripción.es ?? p.descripción.en ?? '';
	const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
	const heroImageXL = getResizedImageUrl('/images/IMG_6403.jpg', 2400);
	const heroImageLg = getResizedImageUrl('/images/IMG_6403.jpg', 1800);
	const heroImageMd = getResizedImageUrl('/images/IMG_6403.jpg', 1200);
	const heroImageSm = getResizedImageUrl('/images/IMG_6403.jpg', 800);
	const heroAccentLg = getResizedImageUrl('/images/IMG_6395.jpg', 1100);
	const heroAccentSm = getResizedImageUrl('/images/IMG_6395.jpg', 640);
	let heroSection: HTMLElement | undefined;
	let heroProgress = $state(0);
	let added = $state(new Set<string>());
	let quantities: Record<string, number> = {};
	// Initialize default quantities to 1 immediately to avoid SSR/mount mismatch
	for (const p of data.products) {
		if (quantities[p.id] == null) quantities[p.id] = 1;
	}

	function handleAdd(product: Product) {
		const qty = quantities[product.id] ?? 1;
		cart.add(product, qty);
		added.add(product.id);
		added = new Set(added);
		setTimeout(() => {
			added.delete(product.id);
			added = new Set(added);
		}, 800);
	}

	onMount(() => {
		if (!browser) return;
		const handleScroll = () => {
			if (!heroSection) return;
			const rect = heroSection.getBoundingClientRect();
			const progress = rect.height > 0 ? Math.min(Math.max(-rect.top / rect.height, 0), 1) : 0;
			heroProgress = progress;
		};
		handleScroll();
		window.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('resize', handleScroll);
		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', handleScroll);
		};
	});
</script>

<section class="home-hero u-full-bleed" bind:this={heroSection} style={`--hero-progress:${heroProgress}`}>
	<picture class="home-hero__picture">
		<source
			media="(min-width: 1024px)"
			srcset={`${heroImageMd} 1200w, ${heroImageLg} 1800w, ${heroImageXL} 2400w`}
			sizes="100vw"
		/>
		<source
			media="(min-width: 640px)"
			srcset={`${heroImageSm} 800w, ${heroImageMd} 1200w`}
			sizes="100vw"
		/>
		<img
			class="home-hero__image"
			src={heroImageLg}
			alt={t('inicio.hero.image_alt')}
			loading="eager"
			fetchpriority="high"
		/>
	</picture>
	<div class="home-hero__scrim" aria-hidden="true"></div>
	<div class="home-hero__content">
		<p class="home-hero__eyebrow">{t('inicio.hero.eyebrow')}</p>
		<h1 class="home-hero__title">{t('inicio.hero.title')}</h1>
		<p class="home-hero__copy">{t('inicio.hero.copy')}</p>
		<a class="home-hero__cta" href="#catalogo">{t('inicio.hero.cta')}</a>
	</div>
	<picture class="home-hero__accent" aria-hidden="true">
		<source media="(min-width: 768px)" srcset={`${heroAccentLg} 1100w`} sizes="40vw" />
		<img class="home-hero__accent-img" src={heroAccentSm} alt="" loading="lazy" />
	</picture>
</section>

<section class="home-catalog u-content-wrap" id="catalogo">
	<h2 class="home-catalog__heading">{t('etiqueta_catalogo')}</h2>
	<ul class="home-catalog__grid">
	{#each data.products as product (product.id)}
		<li class="border rounded-lg shadow-md p-4 flex flex-col gap-2 bg-white">
			{#if product.imagen}
				<img
					src={getResizedImageUrl(product.imagen, 400)}
					alt={nameOf(product)}
					class="w-full h-48 object-cover rounded-md"
					loading="lazy"
				/>
			{/if}
            <h2 class="font-semibold text-lg">{nameOf(product)}</h2>
            <p class="text-sm text-gray-700">{descOf(product)}</p>
			<p class="font-medium">{fmtCOP.format(product.precio)}</p>
			<input
				type="number"
				min="1"
				class="w-20 border rounded p-1 text-sm"
				bind:value={quantities[product.id]}
			/>
			<button
				class={`mt-auto rounded text-white py-1 px-2 text-sm ${added.has(product.id) ? 'bg-green-600' : 'bg-blue-600'}`}
				onclick={() => handleAdd(product)}
			>
				{#if added.has(product.id)}
					{t('agregado_label')}
				{:else}
					{t('agrega_label')}
				{/if}
			</button>
		</li>
	{/each}
</ul>
</section>

<style>
	.home-hero {
		position: relative;
		min-height: clamp(520px, 100vh, 860px);
		overflow: hidden;
	}

	.home-hero__picture,
	.home-hero__image,
	.home-hero__scrim {
		position: absolute;
		inset: 0;
	}

	.home-hero__picture {
		display: block;
	}

	.home-hero__image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.home-hero__scrim {
		background: linear-gradient(180deg, rgba(9, 6, 8, 0.7) 0%, rgba(9, 6, 8, 0.25) 38%, rgba(9, 6, 8, 0.75) 100%);
		pointer-events: none;
	}

	.home-hero__content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: clamp(0.75rem, 2vw, 1.75rem);
		padding: clamp(1.75rem, 8vw, 3rem) clamp(1.25rem, 6vw, 4rem);
		max-width: clamp(18rem, 60vw, 34rem);
		color: #fdfaf3;
		transform: translateY(calc(var(--hero-progress, 0) * 48px));
		opacity: clamp(0, 1, 1 - (var(--hero-progress, 0) * 1.35));
	}

	.home-hero__eyebrow {
		font-size: clamp(0.75rem, 2.5vw, 0.95rem);
		letter-spacing: 0.28em;
		text-transform: uppercase;
		font-weight: 600;
		opacity: 0.85;
	}

	.home-hero__title {
		font-family: 'Elgraine', 'Times New Roman', serif;
		font-weight: 700;
		font-size: clamp(2.75rem, 9vw, 5.5rem);
		line-height: 0.9;
		text-wrap: balance;
	}

	.home-hero__copy {
		font-size: clamp(1rem, 3.4vw, 1.25rem);
		line-height: 1.6;
		max-width: 34ch;
		color: rgba(253, 250, 243, 0.82);
	}

	.home-hero__cta {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.85rem 1.7rem;
		border-radius: 9999px;
		background: rgba(253, 250, 243, 0.92);
		color: #2c1a27;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
		box-shadow: 0 16px 36px -18px rgba(20, 12, 16, 0.75);
	}

	.home-hero__cta:hover {
		transform: translateY(-2px);
		box-shadow: 0 18px 45px -18px rgba(20, 12, 16, 0.78);
	}

	.home-hero__cta:active {
		transform: translateY(0);
		box-shadow: 0 10px 28px -14px rgba(20, 12, 16, 0.8);
	}

	.home-hero__accent {
		position: absolute;
		right: clamp(1.25rem, 7vw, 5rem);
		bottom: clamp(1.5rem, 8vw, 4.5rem);
		z-index: 1;
		width: min(52vw, 320px);
		transform: translateY(calc(var(--hero-progress, 0) * 70px));
		opacity: clamp(0, 1, 1 - (var(--hero-progress, 0) * 1.5));
		transition: opacity 180ms linear;
	}

	.home-hero__accent-img {
		width: 100%;
		display: block;
		border-radius: 28px;
		object-fit: cover;
		box-shadow: 0 26px 70px -30px rgba(14, 9, 12, 0.6);
	}

	.home-catalog {
		padding-top: clamp(3rem, 8vw, 5.5rem);
		padding-bottom: clamp(4rem, 9vw, 6rem);
	}

	.home-catalog__heading {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 700;
		margin-bottom: clamp(1.5rem, 5vw, 2.75rem);
		font-family: 'Elgraine', 'Times New Roman', serif;
		color: #2f1d2b;
	}

	.home-catalog__grid {
		display: grid;
		gap: 1.25rem;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
	}

	@media (max-width: 639px) {
		.home-hero__accent {
			display: none;
		}
	}

	@media (min-width: 768px) {
		.home-hero {
			min-height: clamp(580px, 88vh, 920px);
		}

		.home-hero__content {
			padding: clamp(2.5rem, 9vw, 4rem) clamp(3rem, 10vw, 6rem);
		}
	}

	@media (min-width: 1024px) {
		.home-hero__content {
			max-width: clamp(24rem, 38vw, 34rem);
		}

		.home-hero__accent {
			width: min(28vw, 420px);
		}
	}
</style>
