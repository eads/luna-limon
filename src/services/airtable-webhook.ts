// services/airtable-webhook.ts
import { APIGatewayProxyEventV2, APIGatewayProxyResult, Context } from 'aws-lambda';
import { spawn } from 'child_process';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// WAIT_BEFORE_BUILD and BUILD_DEBOUNCE are in milliseconds

const WAIT_BEFORE_BUILD = parseInt(process.env.WAIT_BEFORE_BUILD ?? '30000', 10);
const BUILD_DEBOUNCE = parseInt(process.env.BUILD_DEBOUNCE ?? '300000', 10);

const BUILD_TABLE = process.env.BUILD_TABLE ?? '';

let buildTimer: NodeJS.Timeout | null = null;
let lastBuild = 0;
let loadedFromStore = false;
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (
	event: APIGatewayProxyEventV2,
	context: Context
): Promise<APIGatewayProxyResult> => {
	context.callbackWaitsForEmptyEventLoop = false;

        console.log('Airtable webhook payload:', event.body);

        if (!loadedFromStore) {
                loadedFromStore = true;
                lastBuild = await getLastBuild();
        }

	if (buildTimer) {
		clearTimeout(buildTimer);
	}

	buildTimer = setTimeout(() => {
		if (Date.now() - lastBuild < BUILD_DEBOUNCE) {
			console.log('Skipping build due to debounce window');
			return {
				statusCode: 200,
				body: 'skipped'
			};
		}

		lastBuild = Date.now();
		buildTimer = null;
		runBuild();
	}, WAIT_BEFORE_BUILD);

	return {
		statusCode: 200,
		body: 'scheduled'
	};
};

function runBuild() {
       console.log('Running build job...');
       const stage = process.env.SST_STAGE ?? process.env.STAGE ?? 'staging';
       try {
               await codebuild.send(
                       new StartBuildCommand({
                               projectName: CODEBUILD_PROJECT,
                               environmentVariablesOverride: [
                                       {
                                               name: 'SST_STAGE',
                                               value: stage,
                                               type: 'PLAINTEXT'
                                       }
                               ]
                       })
               );
               console.log('CodeBuild started.');
               await setLastBuild(lastBuild);
       } catch (err) {
               console.error('Failed to start CodeBuild', err);
       }
}

async function getLastBuild(): Promise<number> {
       if (!BUILD_TABLE) return 0;
       try {
               const res = await dynamo.send(
                       new GetCommand({ TableName: BUILD_TABLE, Key: { id: 'last' } })
               );
               return typeof res.Item?.timestamp === 'number' ? res.Item.timestamp : 0;
       } catch (err) {
               console.error('Failed to read last build timestamp', err);
               return 0;
       }
}

async function setLastBuild(timestamp: number) {
       if (!BUILD_TABLE) return;
       try {
               await dynamo.send(
                       new PutCommand({
                               TableName: BUILD_TABLE,
                               Item: { id: 'last', timestamp }
                       })
               );
       } catch (err) {
               console.error('Failed to store last build timestamp', err);
       }
}
