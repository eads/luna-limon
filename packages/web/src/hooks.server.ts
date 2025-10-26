import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';

// creating a handle to use the paraglide middleware
const paraglideHandle: Handle = async ({ event, resolve }) => {
	const DEBUG = process.env.DEBUG_ORDER === '1';
	if (DEBUG && event.url.pathname.startsWith('/api/')) {
		const h = event.request.headers;
		const logHeaders: Record<string, string | null> = {
			'x-event-id': h.get('x-event-id'),
			'x-webhook-secret': h.get('x-webhook-secret') ? 'yes' : null,
			'content-type': h.get('content-type'),
		};
		console.log('[api] incoming', {
			path: event.url.pathname,
			method: event.request.method,
			search: event.url.search,
			headers: logHeaders
		});
	}

	return paraglideMiddleware(event.request, ({ request: localizedRequest, locale }: { request: Request; locale: Locale }) => {
		event.request = localizedRequest;
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%lang%', locale)
		});
	});
};

export const handle: Handle = paraglideHandle;
