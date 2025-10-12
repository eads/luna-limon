// stack/services.ts

export function Services() {
  const stage = $app.stage;
  const siteDomain = stage === "prod" ? "lunalimon.co.com" : `${stage}.lunalimon.co.com`;
  const siteOrigin = stage === "prod" ? "https://lunalimon.co.com" : `https://${siteDomain}`;
  const allowedImageHosts = [
    "airtableusercontent.com",
    siteDomain,
    ...(stage === "prod" ? ["www.lunalimon.co.com"] : []),
  ];

  /* ───────────────── existing resources ───────────────────── */
  const resizer = new sst.aws.Function("ImageResizerFn", {
    handler: "packages/services/image-resizer.handler",
    nodejs: { install: ["sharp"] },
    runtime: "nodejs20.x",
    memory: "512 MB",
    url: true,
    environment: {
      SST_STAGE: stage,
      ALLOWED_IMAGE_HOSTS: allowedImageHosts.join(","),
      SITE_BASE_URL: siteOrigin,
    },
  });

  new sst.Linkable("ImageResizer", {
    properties: { url: resizer.url },
    include: [
      sst.aws.permission({
        actions: ["lambda:InvokeFunctionUrl"],
        resources: [resizer.arn],
      }),
    ],
  });


  /* ───────────────── Invalidation queue (coalesce 30s) ─────── */
  const invalidateQueue = new sst.aws.Queue("InvalidateQueue", {
    fifo: true,
    contentBasedDeduplication: true,
    queueName: "luna-limon-invalidations.fifo",
    visibilityTimeout: "60 seconds",
  });

  invalidateQueue.subscribe({
    handler: "packages/services/cdn-invalidator.handler",
    nodejs: { install: ["@aws-sdk/client-cloudfront"] },
    batchSize: 1,
    batchingWindow: "1 second",
    permissions: [
      sst.aws.permission({
        actions: [
          "cloudfront:ListDistributions",
          "cloudfront:CreateInvalidation",
        ],
        resources: ["*"]
      })
    ],
    environment: {
      SST_STAGE: stage,
      CLOUDFRONT_DISTRIBUTION_ID: process.env.CLOUDFRONT_DISTRIBUTION_ID ?? "",
      CDN_ALIAS: `luna-limon--${stage}.grupovisual.org`,
    },
  });

  /* ───────────────── Airtable webhook → enqueue ─────────────── */
  const airtableWebhook = new sst.aws.Function("AirtableWebhookFn", {
    handler: "packages/services/airtable-webhook.handler",
    nodejs: { install: ["@aws-sdk/client-sqs"] },
    url: { auth: "none", cors: true },
    environment: {
      SST_STAGE: stage,
      WEBHOOK_SECRET: process.env.WEBHOOK_SECRET ?? "",
      INVALIDATE_QUEUE_URL: invalidateQueue.url,
    },
    link: [invalidateQueue],
  });

  /* ───────────────── exports ──────────────────────────────── */
  return {
    resizer,
    invalidateQueue,
    airtableWebhook,
  };
}
