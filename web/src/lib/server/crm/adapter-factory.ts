import { NoopAdapter } from './noop-adapter';
import { WebhookAdapter } from './webhook-adapter';
import type { CrmAdapter } from './types';

export function createCrmAdapter(): CrmAdapter {
	const webhook = import.meta.env.LEAD_WEBHOOK_URL;
	if (webhook) return new WebhookAdapter(webhook);
	return new NoopAdapter();
}
