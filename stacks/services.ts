// import * as sst from "sst";
export function Services() {
  const stage = $app.stage;
  
  const resizer = new sst.aws.Function("ImageResizerFn", {
    handler: "packages/services/image-resizer.handler",
    nodejs: { install: ["sharp"] },
    runtime: "nodejs20.x",
    memory: "512 MB",
    url: true            // creates a Function URL
  });

  // Tiny “facade” that surfaces only the URL (+ optional perms)
  new sst.Linkable("ImageResizer", {
    properties: { url: resizer.url },
    include: [
      sst.aws.permission({
        actions: ["lambda:InvokeFunctionUrl"],
        resources: [resizer.arn]
      })
    ]
  });


  // SQS FIFO queue for debouncing build triggers
  const buildQueue = new sst.aws.Queue('BuildQueue', {
    fifo: true,
    contentBasedDeduplication: true,
    queueName: 'luna-limon-builds.fifo',
    delay: '30 seconds',
    visibilityTimeout: '900 seconds',
  });    
  
  // Attach invoker Lambda as a subscriber of the queue
  buildQueue.subscribe({
    handler: 'packages/services/airtable-build-invoker.handler',
    functionName: 'BuildQueueConsumerFunction',
    nodejs: { install: ['@aws-sdk/client-codebuild'] },
    environment: {
      CODEBUILD_PROJECT: process.env.CODEBUILD_PROJECT ?? '',
      SST_STAGE: stage,
    },
  });

  // Airtable Webhook function: enqueues messages into SQS
  const airtableWebhook = new sst.aws.Function('AirtableWebhookFn', {
    handler: 'packages/services/airtable-webhook.handler',
    nodejs: { install: ['@aws-sdk/client-sqs'] },
    url: true,
    environment: {
      WAIT_BEFORE_BUILD: process.env.WAIT_BEFORE_BUILD ?? '30000',
      BUILD_QUEUE_URL: buildQueue.url,
      SST_STAGE: stage,
    },
    link: [buildQueue],
  });

  return { resizer, buildQueue, airtableWebhook };
}
