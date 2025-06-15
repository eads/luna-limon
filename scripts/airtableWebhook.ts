import { createServer } from 'http';
import { exec } from 'child_process';

let timer: NodeJS.Timeout | undefined;
const delay = 30000; // 30 seconds debounce

function queueBuild() {
	if (timer) clearTimeout(timer);
	timer = setTimeout(() => {
		const command = 'pnpm run build && pnpm exec sst deploy';
		exec(command, (err, stdout, stderr) => {
			if (err) {
				console.error('build failed', err);
			} else {
				console.log(stdout);
				console.error(stderr);
			}
		});
	}, delay);
}

createServer((req, res) => {
	if (req.method === 'POST') {
		queueBuild();
		res.writeHead(200);
		res.end('queued');
	} else {
		res.writeHead(404);
		res.end();
	}
}).listen(process.env.PORT ?? 9999, () => {
	console.log('listening for Airtable webhooks');
});
