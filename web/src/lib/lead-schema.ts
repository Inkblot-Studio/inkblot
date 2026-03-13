import { z } from 'zod';

export const leadSchema = z.object({
	companyName: z.string().trim().min(2).max(120),
	country: z.string().trim().min(2).max(80),
	industry: z.string().trim().min(2).max(80),
	painPoints: z.array(z.string().min(2).max(80)).min(1).max(5),
	whatTried: z.string().trim().min(6).max(500),
	investmentReady90Days: z.boolean(),
	timeline: z.enum(['now', '1-2-months', '3-plus-months']),
	role: z.enum(['owner-exec', 'ops-lead', 'manager', 'other']),
	workEmail: z.email().max(200),
	website: z.string().max(0).optional().default(''),
});

export type LeadPayload = z.infer<typeof leadSchema>;

export const leadStatusSchema = z.enum(['new', 'qualified', 'needs_info', 'declined']);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

export type LeadRecord = {
	id: string;
	payload: LeadPayload;
	score: number;
	status: LeadStatus;
	createdAt: string;
	updatedAt: string;
};
