// services/airtable-webhook.ts
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  CloudFrontClient,
  CreateInvalidationCommand,
  ListDistributionsCommand,
} from "@aws-sdk/client-cloudfront";

// Optional security: shared secret check (set in webhook URL as ?secret=...)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// Prefer explicit distribution ID; fallback to lookup by alias
const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID;
const CDN_ALIAS = process.env.CDN_ALIAS || `luna-limon--${process.env.SST_STAGE}.grupovisual.org`;

const cf = new CloudFrontClient({});

async function resolveDistributionId(): Promise<string> {
  if (CLOUDFRONT_DISTRIBUTION_ID) return CLOUDFRONT_DISTRIBUTION_ID;

  // Fallback: find by alias (domain)
  const dists = await cf.send(new ListDistributionsCommand({}));
  const items = dists.DistributionList?.Items ?? [];
  const found = items.find((d) => d.Aliases?.Items?.includes(CDN_ALIAS));
  if (!found?.Id) throw new Error(`CloudFront distribution not found for alias ${CDN_ALIAS}`);
  return found.Id;
}

function inferPathsFromAirtable(body?: string | null): string[] {
  // Basic default: invalidate everything if unknown
  if (!body) return ["/*"];
  try {
    const payload = JSON.parse(body);
    // Airtable payload shapes vary. If we can detect a table, narrow paths.
    const table = payload?.change?.tableId || payload?.payload?.record?.tableId || payload?.tableId;
    if (table) {
      // For product changes, invalidate home pages in both locales
      return ["/", "/es", "/en", "/index.html"].map((p) => (p.startsWith("/") ? p : `/${p}`));
    }
  } catch {
    // ignore parse errors
  }
  return ["/*"];
}

async function warmPaths(baseUrl: string, paths: string[]) {
  for (const p of paths) {
    try {
      const url = new URL(p, baseUrl).toString();
      console.log("Warming:", url);
      await fetch(url, { method: "GET" });
    } catch (err) {
      console.warn("Warm failed for", p, err);
    }
  }
}

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResult> => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (WEBHOOK_SECRET) {
    const got = event.queryStringParameters?.secret;
    if (!got || got !== WEBHOOK_SECRET) {
      return { statusCode: 401, body: "unauthorized" };
    }
  }

  console.log("Airtable webhook payload:", event.body);

  const distId = await resolveDistributionId();
  const paths = inferPathsFromAirtable(event.body);

  console.log("Invalidating CloudFront:", distId, paths);
  await cf.send(
    new CreateInvalidationCommand({
      DistributionId: distId,
      InvalidationBatch: {
        CallerReference: `${Date.now()}`,
        Paths: { Quantity: paths.length, Items: paths },
      },
    }),
  );

  // Optional: warm the common pages to repopulate edge caches
  const aliasUrl = `https://${CDN_ALIAS}`;
  await warmPaths(aliasUrl, [
    "/",
    "/es",
    "/en",
  ]);

  return { statusCode: 200, body: "invalidated" };
};
