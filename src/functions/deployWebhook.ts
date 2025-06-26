import { execSync } from 'child_process';

export const handler = async (event: any) => {
	// Verify this is from your authorized source
	const authHeader = event.headers.authorization;
	if (authHeader !== `Bearer ${process.env.DEPLOY_WEBHOOK_SECRET}`) {
		return {
			statusCode: 401,
			body: JSON.stringify({ error: 'Unauthorized' })
		};
	}

	try {
		const payload = JSON.parse(event.body || '{}');
		console.log('Received deploy webhook:', payload);

		// Run the build commands in sequence
		console.log('Running i18n build...');
		execSync('npm run build:i18n', {
			stdio: 'inherit',
			cwd: process.cwd(),
			env: { ...process.env, NODE_ENV: 'production' }
		});

		console.log('Running main build...');
		execSync('npm run build', {
			stdio: 'inherit',
			cwd: process.cwd(),
			env: { ...process.env, NODE_ENV: 'production' }
		});

		console.log('Deploying with SST...');
		execSync('npx sst deploy', {
			stdio: 'inherit',
			cwd: process.cwd(),
			env: { ...process.env }
		});

		return {
			statusCode: 200,
			body: JSON.stringify({
				message: 'Deploy completed successfully',
				timestamp: new Date().toISOString(),
				source: payload.source || 'unknown'
			})
		};
	} catch (error) {
		console.error('Deploy webhook error:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({
				error: 'Deploy failed',
				details: error instanceof Error ? error.message : String(error)
			})
		};
	}
};
