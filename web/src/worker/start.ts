import { startLeadWorker } from '../lib/server/queue/lead-worker';
import { logger } from '../lib/observability/logger';

const worker = startLeadWorker();

logger.info('Lead worker started');

process.on('SIGTERM', async () => {
	logger.info('Shutting down lead worker');
	await worker.close();
	process.exit(0);
});
