import type { LeadRecord } from '../../lead-schema';
import type { CrmAdapter, CrmSyncResult } from './types';

export class NoopAdapter implements CrmAdapter {
	name = 'noop';

	async createLead(_record: LeadRecord): Promise<CrmSyncResult> {
		return { ok: true, destination: this.name };
	}

	async updateLeadStatus(_leadId: string, _status: string): Promise<CrmSyncResult> {
		return { ok: true, destination: this.name };
	}
}
