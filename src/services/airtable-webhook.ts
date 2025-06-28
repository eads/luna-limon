// services/airtable-webhook.ts
import { APIGatewayProxyEventV2, APIGatewayProxyResult, Context } from 'aws-lambda';
import { spawn } from 'child_process';

// WAIT_BEFORE_BUILD and BUILD_DEBOUNCE are in milliseconds

const WAIT_BEFORE_BUILD = parseInt(process.env.WAIT_BEFORE_BUILD ?? '30000', 10);
const BUILD_DEBOUNCE = parseInt(process.env.BUILD_DEBOUNCE ?? '300000', 10);

let buildTimer: NodeJS.Timeout | null = null;
let lastBuild = 0;

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
       const command = `pnpm build:i18n && pnpm build && npx sst deploy --stage ${stage}`;
       const proc = spawn('sh', ['-c', command], {
               stdio: 'inherit'
       });
       proc.on('close', (code) => {
               console.log('Build finished with code', code);
       });
}
