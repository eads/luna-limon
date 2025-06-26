export const handler = async (event: any) => {
	console.log(`Processing ${event.Records.length} rebuild requests`);

	for (const record of event.Records) {
		try {
			const message = JSON.parse(record.body);
			console.log('Received rebuild request:', message);
		} catch (error) {
			console.error('Failed to process rebuild:', error);
			throw error; // This will cause the message to be retried
		}
	}
};

// Originally this function would trigger a deploy using another webhook.
// Deployment has been removed for now while debugging the webhook flow.
