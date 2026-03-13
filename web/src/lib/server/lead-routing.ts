import type { LeadRecord } from '../lead-schema';
import { createCrmAdapter } from './crm/adapter-factory';
import { insertLeadAudit } from './persistence/lead-repository';

export type RoutingResult = {
	accepted: boolean;
	destination: string;
};

export async function routeLeadForManualReview(record: LeadRecord): Promise<RoutingResult> {
	const adapter = createCrmAdapter();
	const result = await adapter.createLead(record);
	await insertLeadAudit(record.id, `Lead routed to ${adapter.name}`);

	return {
		accepted: true,
		destination: result.destination,
	};
}
