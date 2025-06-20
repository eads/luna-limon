export const handler = async (event: any) => {
  console.log(`Processing ${event.Records.length} rebuild requests`);

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      console.log("Processing rebuild request:", {
        timestamp: new Date(message.timestamp).toISOString(),
        messageAge: Date.now() - message.timestamp,
      });

      // Trigger the rebuild via internal webhook
      await triggerRebuild();

    } catch (error) {
      console.error("Failed to process rebuild:", error);
      throw error; // This will cause the message to be retried
    }
  }
};

async function triggerRebuild() {
  // Call our internal deploy webhook
  const response = await fetch(process.env.DEPLOY_WEBHOOK_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEPLOY_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      source: "airtable-webhook",
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deploy webhook failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log("Rebuild triggered successfully:", result);
  
  return result;
}