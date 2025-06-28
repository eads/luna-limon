// services/airtable-webhook.ts
import { APIGatewayProxyEventV2, APIGatewayProxyResult, Context } from 'aws-lambda';
import { CodeBuildClient, StartBuildCommand } from '@aws-sdk/client-codebuild';

// WAIT_BEFORE_BUILD and BUILD_DEBOUNCE are in milliseconds

const WAIT_BEFORE_BUILD = parseInt(process.env.WAIT_BEFORE_BUILD ?? '30000', 10);
const BUILD_DEBOUNCE = parseInt(process.env.BUILD_DEBOUNCE ?? '300000', 10);

let buildTimer: NodeJS.Timeout | null = null;
let lastBuild = 0;
const CODEBUILD_PROJECT = process.env.CODEBUILD_PROJECT!;
const codebuild = new CodeBuildClient({});

export const handler = async (
	event: APIGatewayProxyEventV2,
	context: Context
): Promise<APIGatewayProxyResult> => {
	context.callbackWaitsForEmptyEventLoop = false;

	console.log('Airtable webhook payload:', event.body);

	if (buildTimer) {
		clearTimeout(buildTimer);
	}

	buildTimer = setTimeout(() => {
		if (Date.now() - lastBuild < BUILD_DEBOUNCE) {
			console.log('Skipping build due to debounce window');
			return;
		}

		lastBuild = Date.now();
		buildTimer = null;
               runBuild().catch((err) => console.error('Build failed', err));
	}, WAIT_BEFORE_BUILD);

	return {
		statusCode: 200,
		body: 'scheduled'
	};
};

async function runBuild() {
       console.log('Starting CodeBuild project...');
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
       } catch (err) {
               console.error('Failed to start CodeBuild', err);
       }
}
