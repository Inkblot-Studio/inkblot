import type { LeadRecord } from '../../lead-schema';
import type { CrmAdapter, CrmSyncResult } from './types';

export class WebhookAdapter implements CrmAdapter {
	name = 'webhook';

	constructor(private readonly webhookUrl: string) {}

	async createLead(record: LeadRecord): Promise<CrmSyncResult> {
		const response = await fetch(this.webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'createLead',
				source: 'inkblot-web',
				record,
			}),
		});

		if (!response.ok) {
			throw new Error(`Webhook CRM createLead failed with status ${response.status}`);
		}

		return { ok: true, destination: this.name };
	}

	async updateLeadStatus(leadId: string, status: string): Promise<CrmSyncResult> {
		const response = await fetch(this.webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'updateLeadStatus',
				source: 'inkblot-web',
				leadId,
				status,
			}),
		});

		if (!response.ok) {
			throw new Error(`Webhook CRM updateLeadStatus failed with status ${response.status}`);
		}

		return { ok: true, destination: this.name };
	}
}
