// services/airtable-webhook.ts
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const QUEUE_URL         = process.env.BUILD_QUEUE_URL!;

const sqs = new SQSClient({});

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResult> => {
  context.callbackWaitsForEmptyEventLoop = false;
  console.log("Airtable webhook payload:", event.body);

  await sqs.send(
    new SendMessageCommand({
      QueueUrl:              QUEUE_URL,
      MessageBody:           "build",              // arbitrary payload
      MessageGroupId:        "luna-limon-builds",  // all messages in one group
      MessageDeduplicationId: "last-build",        // static => only one in flight
    })
  );

  return {
    statusCode: 200,
    body: "queued",
  };
};
