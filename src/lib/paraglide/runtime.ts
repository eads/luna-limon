export function localizeHref(href: string, { locale }: { locale: string }) {
	const url = new URL(href, 'http://dummy');
	url.searchParams.set('lang', locale);
	return url.pathname + url.search;
}

export function setLocale(locale: string) {
	void locale; // placeholder to satisfy lint
}

export function deLocalizeUrl(url: URL) {
	return url;
}
