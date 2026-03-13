export const analyticsEventNames = [
	'lead_form_open',
	'lead_form_submit_attempt',
	'lead_form_submit_success',
	'lead_form_submit_error',
	'immersive_world_chapter_change',
	'immersive_world_quality_degrade',
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export type AnalyticsEvent = {
	name: AnalyticsEventName;
	timestamp: string;
	properties?: Record<string, string | number | boolean>;
};

export async function trackAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
	const endpoint = import.meta.env.PUBLIC_ANALYTICS_ENDPOINT;
	if (!endpoint) return;

	await fetch(endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(event),
	}).catch(() => undefined);
}
