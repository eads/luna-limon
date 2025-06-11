export function paraglideMiddleware(
	request: Request,
	handler: (opts: { request: Request; locale: string }) => Promise<Response> | Response
) {
	const locale = 'es';
	return handler({ request, locale });
}
