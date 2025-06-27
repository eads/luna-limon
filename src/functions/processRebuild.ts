export const handler = async (event: any) => {
	console.log(`Processing ${event.Records.length} rebuild requests`);

	for (const record of event.Records) {
		try {
			const message = JSON.parse(record.body);
			console.log('Processing rebuild request:', {
				timestamp: new Date(message.timestamp).toISOString(),
				messageAge: Date.now() - message.timestamp
			});

			// For now just log the payload instead of triggering a deploy
			console.log('Payload:', message.payload);
		} catch (error) {
			console.error('Failed to process rebuild:', error);
			throw error; // This will cause the message to be retried
		}
	}
};
