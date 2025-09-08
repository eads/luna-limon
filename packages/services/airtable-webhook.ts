// services/airtable-webhook.ts (enqueue-only)
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const INVALIDATE_QUEUE_URL = process.env.INVALIDATE_QUEUE_URL!;
const STAGE = process.env.SST_STAGE || 'staging';

const sqs = new SQSClient({});

function inferPathsFromAirtable(body?: string | null): string[] {
  if (!body) return ['/', '/es', '/en', '/index.html'];
  try {
    const payload = JSON.parse(body);
    const table = payload?.change?.tableId || payload?.payload?.record?.tableId || payload?.tableId;
    if (table) return ['/', '/es', '/en', '/index.html'];
  } catch {}
  return ['/', '/es', '/en', '/index.html'];
}

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResult> => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (WEBHOOK_SECRET) {
    const got = event.queryStringParameters?.secret;
    if (!got || got !== WEBHOOK_SECRET) {
      return { statusCode: 401, body: 'unauthorized' };
    }
  }

  const paths = inferPathsFromAirtable(event.body);
  // Coalesce to one invalidation every 60 seconds
  const windowSec = 60;
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const dedupId = `${STAGE}-${bucket}`;

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: INVALIDATE_QUEUE_URL,
      MessageBody: JSON.stringify({ paths, bucket }),
      MessageGroupId: 'invalidation',
      MessageDeduplicationId: dedupId,
    })
  );

  // Airtable expects 200/204 for success
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok: true, queued: true, dedupId, paths }),
  };
};
