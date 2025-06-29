/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'luna-limon',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
    };
  },

  async run() {
    // Debug: Let's see what stage actually is
    const stage = $app.stage;

    // Use SST's built-in AWS Dynamo construct for DynamoDB
    const buildState = new sst.aws.Dynamo('BuildState', {
      fields: { id: 'string' },
      primaryIndex: { hashKey: 'id' },
    });

    // Image Resizer function
    const imageResizer = new sst.aws.Function('ImageResizerFn', {
      handler: 'src/services/image-resizer.handler',
      nodejs: { install: ['sharp', 'node-fetch'] },
      timeout: '30 seconds',
      memory: '512 MB',
      url: { auth: undefined },
    });

    // Airtable Webhook function
    const airtableWebhook = new sst.aws.Function('AirtableWebhookFn', {
      handler: 'src/services/airtable-webhook.handler',
      url: { auth: undefined },
      nodejs: {
        install: [
          '@aws-sdk/client-codebuild',
          '@aws-sdk/client-dynamodb',
          '@aws-sdk/lib-dynamodb',
        ],
      },
      environment: {
        WAIT_BEFORE_BUILD: process.env.WAIT_BEFORE_BUILD ?? '30000',
        BUILD_DEBOUNCE: process.env.BUILD_DEBOUNCE ?? '300000',
        CODEBUILD_PROJECT: process.env.CODEBUILD_PROJECT ?? '',
        SST_STAGE: stage,
        BUILD_TABLE: buildState.tableName,
      },
    });

    // Determine custom domain based on stage
    const domainName =
      stage === 'production'
        ? 'lunalimon--production.grupovisual.org'
        : 'lunalimon--staging.grupovisual.org';

    // Deploy SvelteKit app with linked functions
    new sst.aws.SvelteKit('LunaLimonSite', {
      domain: { name: domainName },
      link: [imageResizer, airtableWebhook],
      environment: {
        RESIZER_URL: imageResizer.url,
      },
    });
  },
});
