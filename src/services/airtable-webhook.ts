// services/airtable-webhook.ts
import { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
	console.log('Airtable webhook payload:', event.body);

	return {
		statusCode: 200,
		body: 'received'
	};
};
