import type { LeadPayload, LeadStatus } from '../../lead-schema';

export type LeadScoreResult = {
	score: number;
	initialStatus: LeadStatus;
};

export function scoreLead(payload: LeadPayload): LeadScoreResult {
	let score = 0;

	if (payload.role === 'owner-exec') score += 20;
	if (payload.role === 'ops-lead') score += 18;
	if (payload.timeline === 'now') score += 20;
	if (payload.timeline === '1-2-months') score += 12;
	if (payload.investmentReady90Days) score += 25;
	score += Math.min(payload.painPoints.length * 8, 24);
	score += payload.whatTried.length > 40 ? 8 : 3;

	const initialStatus: LeadStatus =
		score >= 70 ? 'qualified' : score >= 50 ? 'needs_info' : 'new';

	return { score, initialStatus };
}
