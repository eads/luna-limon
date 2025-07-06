// stack/services.ts
import * as aws from "@pulumi/aws";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const buildEnvKeys = [
  "AIRTABLE_TOKEN",
  "AIRTABLE_BASE",
  "AIRTABLE_COPY_TABLE",
  "AIRTABLE_PRODUCTS_TABLE",
  "AIRTABLE_ORDERS_TABLE",
  "WOMPI_PUBLIC_KEY",
] as const;

export function Services() {
  const stage = $app.stage;

  /* ───────────────── existing resources ───────────────────── */
  const resizer = new sst.aws.Function("ImageResizerFn", {
    handler: "packages/services/image-resizer.handler",
    nodejs: { install: ["sharp"] },
    runtime: "nodejs20.x",
    memory: "512 MB",
    url: true,
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

  const buildQueue = new sst.aws.Queue("BuildQueue", {
    fifo: true,
    contentBasedDeduplication: true,
    queueName: "luna-limon-builds.fifo",
    delay: "10 seconds",
    visibilityTimeout: "900 seconds",
  });

  /* ───────────────── CodeBuild role & project ──────────────── */
  const buildRole = new aws.iam.Role("CodeBuildRole", {
    assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
      statements: [
        {
          effect: "Allow",
          principals: [{ type: "Service", identifiers: ["codebuild.amazonaws.com"] }],
          actions: ["sts:AssumeRole"],
        },
      ],
    }).json,
  });

  // Turnkey policy with S3/Logs/S3-artifacts perms (trim later if you like)
  new aws.iam.RolePolicyAttachment("CodeBuildRoleAttach", {
    role: buildRole.name,
    policyArn: aws.iam.ManagedPolicy.AWSCodeBuildDeveloperAccess,
  });

  new aws.iam.RolePolicy("CodeBuildLogsWrite", {
    role: buildRole.id,
    policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          Resource: "arn:aws:logs:*:*:log-group:/aws/codebuild/*"
        }
      ]
    }),
  });

  const buildProject = new aws.codebuild.Project("WebDeployProject", {
    name: `${stage}-web-deploy`,
    serviceRole: buildRole.arn,
    source: {
      type: "GITHUB",
      location: "https://github.com/eads/luna-limon.git",
      buildspec: "buildspec.yml",   // now it can read the file from the repo
    },
    artifacts: { type: "NO_ARTIFACTS" },
    environment: {
      type: "LINUX_CONTAINER",
      computeType: "BUILD_GENERAL1_SMALL",
      image: "aws/codebuild/standard:7.0",      // Node 20+ is baked in  :contentReference[oaicite:0]{index=0}
      environmentVariables: [
        { name: "STAGE", value: stage },
        ...buildEnvKeys.map((key) => ({
          name: key,
          value: process.env[key] ?? "",        // crash-safe if a var is missing
          type: "PLAINTEXT",
        })),
      ],
    },
    cache: {
      type: "LOCAL",
      modes: ["LOCAL_SOURCE_CACHE", "LOCAL_DOCKER_LAYER_CACHE"],
    },
    timeoutInMinutes: 45,
  });

  /* ───────────────── Lambda that triggers builds ───────────── */
  buildQueue.subscribe({
    handler: "packages/services/airtable-build-invoker.handler",
    functionName: "BuildQueueConsumerFunction",
    nodejs: { install: ["@aws-sdk/client-codebuild"] },
    environment: {
      CODEBUILD_PROJECT: buildProject.name,   // << now wired in
      SST_STAGE: stage,
    },
    // 👉 Fix: use SST’s permission helper
    permissions: [
      sst.aws.permission({
        actions: ["codebuild:StartBuild", "codebuild:BatchGetBuilds"],
        resources: [buildProject.arn],
      }),
    ],
  });

  /* ───────────────── Airtable webhook FN (unchanged) ──────── */
  const airtableWebhook = new sst.aws.Function("AirtableWebhookFn", {
    handler: "packages/services/airtable-webhook.handler",
    nodejs: { install: ["@aws-sdk/client-sqs"] },
    url: true,
    environment: {
      WAIT_BEFORE_BUILD: process.env.WAIT_BEFORE_BUILD ?? "10000",
      BUILD_QUEUE_URL: buildQueue.url,
      SST_STAGE: stage,
    },
    link: [buildQueue],
  });

  /* ───────────────── exports ──────────────────────────────── */
  return {
    resizer,
    buildQueue,
    airtableWebhook,
    buildProject,       // handy if other stacks ever need the ARN
  };
}
