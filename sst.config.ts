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
		// Access stage through $app.stage instead of destructuring
		const stage = $app.stage;
		
		// Create the function first
		const imageResizer = new sst.aws.Function("ImageResizerFn", {
			handler: "src/services/image-resizer.handler",
			nodejs: { install: ["sharp", "node-fetch"] },
			timeout: "30 seconds",
			memory: "512 MB",
			url: {
				auth: stage === "production" ? { type: "jwt" } : undefined
			}
		});

		new sst.aws.SvelteKit('LunaLimonSite', {
			customDomain: {
				domainName:
					stage === 'production'
						? 'lunalimon--production.grupovisual.org'
						: 'lunalimon--staging.grupovisual.org',
				hostedZone: 'grupovisual.org'
			},
			link: [imageResizer],
			environment: {
				RESIZER_URL: imageResizer.url
			}
		});

	}
});