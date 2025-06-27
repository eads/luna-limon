import { APIGatewayProxyHandler } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
	try {
		// Parse the webhook payload
		const payload = JSON.parse(event.body || '{}');

		console.log('Received Airtable webhook:', {
			timestamp: new Date().toISOString(),
			payloadSize: event.body?.length,
			changeType: payload.changeType
		});
		console.log('Payload:', payload);

		// Send to SQS for debounced processing
		// We'll use a fixed message group ID to ensure ordering and enable deduplication
		const messageParams = {
			QueueUrl: process.env.REBUILD_QUEUE_URL!,
			MessageBody: JSON.stringify({
				timestamp: Date.now(),
				payload: payload,
				source: 'airtable'
			}),
			// Use a fixed deduplication ID with short time window
			MessageDeduplicationId: `rebuild-${Math.floor(Date.now() / 30000)}`, // 30-second windows
			MessageGroupId: 'rebuild-group'
		};

		await sqs.send(new SendMessageCommand(messageParams));

		return {
			statusCode: 200,
			body: JSON.stringify({ message: 'Webhook received and queued' })
		};
	} catch (error) {
		console.error('Webhook processing error:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal server error' })
		};
	}
};
