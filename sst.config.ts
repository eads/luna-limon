/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
	app(input) {
		return {
			name: 'luna-limon',
			removal: input?.stage === 'production' ? 'retain' : 'remove',
			protect: ['production'].includes(input?.stage),
			home: 'aws'
		};
	},
	async run() {
		// Debug: Let's see what stage actually is
		const stage = $app.stage;

		// Create the functions
		const imageResizer = new sst.aws.Function('ImageResizerFn', {
			handler: 'src/services/image-resizer.handler',
			nodejs: { install: ['sharp', 'node-fetch'] },
			timeout: '30 seconds',
			memory: '512 MB',
			url: {
				auth: stage === 'production' ? { type: 'jwt' } : undefined
			}
		});

		const airtableWebhook = new sst.aws.Function('AirtableWebhookFn', {
			handler: 'src/services/airtable-webhook.handler',
			url: { auth: undefined }
		});

		// Debug the domain logic
		const domainName =
			stage === 'production'
				? 'lunalimon--production.grupovisual.org'
				: 'lunalimon--staging.grupovisual.org';

		new sst.aws.SvelteKit('LunaLimonSite', {
			domain: {
				name: domainName
			},
			link: [imageResizer, airtableWebhook],
			environment: {
				RESIZER_URL: imageResizer.url
			}
		});
	}
});
