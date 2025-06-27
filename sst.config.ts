/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
	app(input) {
		return {
			name: 'luna-limon',
			// removal: input?.stage === 'production' ? 'retain' : 'remove',
			// protect: ['production'].includes(input?.stage),
			home: 'aws'
		};
	},
	async run() {
		// Stash current stage
		const stage = $app.stage;

		// SQS Queue for debouncing webhook events
		const rebuildQueue = new sst.aws.Queue('RebuildQueue', {
			visibilityTimeoutSeconds: 300 // 5 minutes
		});

		// API for receiving webhooks
		const api = new sst.aws.ApiGatewayV2('WebhookApi', {
			routes: {
				'POST /webhook/airtable': {
					handler: 'src/functions/airtableWebhook.handler',
					environment: {
						REBUILD_QUEUE_URL: rebuildQueue.url
					},
					permissions: [
						{
							actions: ['sqs:SendMessage'],
							resources: [rebuildQueue.arn]
						}
					]
				},
				'POST /webhook/deploy': {
					handler: 'src/functions/deployWebhook.handler',
					timeout: '15 minutes',
					environment: {
						DEPLOY_WEBHOOK_SECRET: process.env.DEPLOY_WEBHOOK_SECRET || 'deploy-secret'
					}
				}
			}
		});

		// Consumer function for the queue
		rebuildQueue.subscribe('src/functions/processRebuild.handler', {
			timeout: '15 minutes',
			environment: {
				DEPLOY_WEBHOOK_URL: $interpolate`${api.url}/webhook/deploy`,
				DEPLOY_WEBHOOK_SECRET: process.env.DEPLOY_WEBHOOK_SECRET || 'deploy-secret'
			}
		});

		// Create image resizer Lambda function
		const imageResizer = new sst.aws.Function('ImageResizerFn', {
			handler: 'src/functions/imageResize.handler',
			nodejs: { install: ['sharp', 'node-fetch'] },
			timeout: '30 seconds',
			memory: '512 MB',
			url: true
		});

		// Per stage domain names
		const domainName =
			stage === 'production'
				? 'lunalimon--production.grupovisual.org'
				: 'lunalimon--staging.grupovisual.org';

		const site = new sst.aws.SvelteKit('LunaLimonSite', {
			domain: {
				name: domainName
			},
			link: [imageResizer],
			environment: {
				RESIZER_URL: imageResizer.url
			}
		});

		return {
			WebhookUrl: $interpolate`${api.url}/webhook/airtable`,
			DeployWebhookUrl: $interpolate`${api.url}/webhook/deploy`,
			QueueUrl: rebuildQueue.url,
			SiteUrl: site.url
		};
	}
});
