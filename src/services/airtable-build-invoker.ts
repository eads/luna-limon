import { SQSEvent, Context } from "aws-lambda";
import { runBuild } from "./run-build";  // wherever your build logic lives

export const handler = async (event: SQSEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  console.log(`Received ${event.Records.length} SQS message(s).`);

  // Should always be 1 record, but we’ll loop defensively:
  for (const record of event.Records) {
    console.log("Invoking build…", record.messageId);
    await runBuild();
  }
};
