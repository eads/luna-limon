/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  // Global app configuration
  app(input) {
    return {
      name: 'luna-limon',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
    };
  },

  // Define all resources using run() for SST v3
  async run() {
    const stage = $app.stage;

    // SQS FIFO queue for debouncing build triggers
    const buildQueue = new sst.aws.Queue('BuildQueue', {
      fifo: true,
      contentBasedDeduplication: true,
      queueName: 'luna-limon-builds.fifo',
      delay: '30 seconds',
      visibilityTimeout: '900 seconds',
    });    // Attach invoker Lambda as a subscriber of the queue
    buildQueue.subscribe({
      handler: 'src/services/airtable-build-invoker.handler',
      functionName: 'BuildQueueConsumerFunction',
      nodejs: { install: ['@aws-sdk/client-codebuild'] },
      environment: {
        CODEBUILD_PROJECT: process.env.CODEBUILD_PROJECT ?? '',
        SST_STAGE: stage,
      },
    });

    // Image Resizer function
    const imageResizer = new sst.aws.Function('ImageResizerFn', {
      handler: 'src/services/image-resizer.handler',
      nodejs: { install: ['sharp', 'node-fetch'] },
      timeout: '30 seconds',
      memory: '512 MB',
      url: true,
    });

    // Airtable Webhook function: enqueues messages into SQS
    const airtableWebhook = new sst.aws.Function('AirtableWebhookFn', {
      handler: 'src/services/airtable-webhook.handler',
      nodejs: { install: ['@aws-sdk/client-sqs'] },
      url: true,
      environment: {
        WAIT_BEFORE_BUILD: process.env.WAIT_BEFORE_BUILD ?? '30000',
        BUILD_QUEUE_URL: buildQueue.url,
        SST_STAGE: stage,
      },
      link: [buildQueue],
    });

    // Deploy SvelteKit site with only necessary links
    new sst.aws.SvelteKit('LunaLimonSite', {
      domain: {
        name: `lunalimon--${stage}.grupovisual.org`,
      },
      link: [imageResizer, airtableWebhook],
      environment: {
        RESIZER_URL: imageResizer.url,
      },
    });
  },
});
