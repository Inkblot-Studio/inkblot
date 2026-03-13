import type { LeadRecord } from '../../lead-schema';

export type CrmSyncResult = {
	ok: boolean;
	destination: string;
	externalId?: string;
};

export interface CrmAdapter {
	name: string;
	createLead(record: LeadRecord): Promise<CrmSyncResult>;
	updateLeadStatus(leadId: string, status: string): Promise<CrmSyncResult>;
}
