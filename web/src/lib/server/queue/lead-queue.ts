import { Queue } from 'bullmq';
import type { LeadRecord } from '../../lead-schema';

export const LEAD_QUEUE_NAME = 'lead-routing';

let queue: Queue | null = null;

function getQueue(): Queue | null {
	if (queue) return queue;

	const redisUrl = import.meta.env.REDIS_URL;
	if (!redisUrl) return null;

	queue = new Queue(LEAD_QUEUE_NAME, {
		connection: { url: redisUrl },
	});
	return queue;
}

export async function enqueueLead(record: LeadRecord): Promise<'queued' | 'direct'> {
	const activeQueue = getQueue();
	if (!activeQueue) return 'direct';

	await activeQueue.add('route-lead', record, {
		attempts: 5,
		backoff: { type: 'exponential', delay: 2_000 },
		removeOnComplete: 500,
		removeOnFail: 2_000,
	});

	return 'queued';
}
