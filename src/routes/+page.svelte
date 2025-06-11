<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref, setLocale } from '$lib/paraglide/runtime';
</script>

<h1>{m.hola()}</h1>

<button onclick={() => setLocale('en')}>Set locale to "en"</button>
<button onclick={() => setLocale('es')}>Set locale to "es"</button>

<br />
<br />
<a href={localizeHref('/about', { locale: 'en' })}>go to about in en</a>
<a href={localizeHref('/about', { locale: 'es' })}>go to about in es</a>