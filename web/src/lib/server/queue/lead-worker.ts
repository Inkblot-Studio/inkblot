import { Worker } from 'bullmq';
import { LEAD_QUEUE_NAME } from './lead-queue';
import type { LeadRecord } from '../../lead-schema';
import { routeLeadForManualReview } from '../lead-routing';
import { insertLeadAudit, updateLeadStatusRecord } from '../persistence/lead-repository';
import { logger } from '../../observability/logger';

export function startLeadWorker() {
	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl) {
		throw new Error('REDIS_URL is required to run lead worker.');
	}

	const worker = new Worker<LeadRecord>(
		LEAD_QUEUE_NAME,
		async (job) => {
			const routing = await routeLeadForManualReview(job.data);
			await updateLeadStatusRecord(job.data.id, 'new');
			await insertLeadAudit(job.data.id, `Worker completed route to ${routing.destination}`);
		},
		{ connection: { url: redisUrl } },
	);

	worker.on('completed', (job) => {
		logger.info({ jobId: job.id }, 'Lead job completed');
	});

	worker.on('failed', (job, err) => {
		logger.error({ jobId: job?.id, error: err.message }, 'Lead job failed');
	});

	return worker;
}
