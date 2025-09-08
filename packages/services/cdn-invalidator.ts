import { SQSEvent, Context } from "aws-lambda";
import {
  CloudFrontClient,
  CreateInvalidationCommand,
  ListDistributionsCommand,
} from "@aws-sdk/client-cloudfront";

const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID;
const CDN_ALIAS = process.env.CDN_ALIAS || `luna-limon--${process.env.SST_STAGE}.grupovisual.org`;

const cf = new CloudFrontClient({});

async function resolveDistributionId(): Promise<string> {
  if (CLOUDFRONT_DISTRIBUTION_ID) return CLOUDFRONT_DISTRIBUTION_ID;
  const dists = await cf.send(new ListDistributionsCommand({}));
  const items = dists.DistributionList?.Items ?? [];
  const found = items.find((d) => d.Aliases?.Items?.includes(CDN_ALIAS));
  if (!found?.Id) throw new Error(`CloudFront distribution not found for alias ${CDN_ALIAS}`);
  return found.Id;
}

export const handler = async (event: SQSEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  console.log(`SQS records: ${event.Records.length}`);

  const distId = await resolveDistributionId();
  // Default set of paths per our site
  const paths = ["/", "/es", "/en", "/index.html"];
  const callerReference = `${process.env.SST_STAGE || 'staging'}-${Date.now()}`;

  console.log("Invalidating CloudFront:", { distId, paths, callerReference });
  const result = await cf.send(
    new CreateInvalidationCommand({
      DistributionId: distId,
      InvalidationBatch: {
        CallerReference: callerReference,
        Paths: { Quantity: paths.length, Items: paths },
      },
    }),
  );
  console.log("Invalidation created:", result.Invalidation?.Id, result.Invalidation?.Status);

  // Optional warming to repopulate caches quickly
  try {
    const alias = process.env.CDN_ALIAS || '';
    if (alias) {
      const base = `https://${alias}`;
      for (const p of ["/", "/es", "/en"]) {
        const url = new URL(p, base).toString();
        console.log("Warming:", url);
        await fetch(url, { method: 'GET' });
      }
    }
  } catch (e) {
    console.warn('Warm failed', e);
  }
};
