import type { LeadPayload } from '../lead-schema';

export type RoutingResult = {
	accepted: boolean;
	destination: 'none' | 'webhook';
};

/**
 * Manual-review friendly lead routing.
 * For v1 we route to an ops webhook (CRM or automation entrypoint).
 */
export async function routeLeadForManualReview(lead: LeadPayload): Promise<RoutingResult> {
	const webhookUrl = import.meta.env.LEAD_WEBHOOK_URL;

	if (!webhookUrl) {
		return { accepted: true, destination: 'none' };
	}

	const response = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			source: 'inkblot-web-v1',
			receivedAt: new Date().toISOString(),
			lead,
		}),
	});

	if (!response.ok) {
		throw new Error(`Lead webhook failed with status ${response.status}`);
	}

	return { accepted: true, destination: 'webhook' };
}
