import type { APIRoute } from 'astro';
import { leadSchema } from '../../lib/lead-schema';
import { routeLeadForManualReview } from '../../lib/server/lead-routing';

export const POST: APIRoute = async ({ request }) => {
	try {
		const rawBody = await request.json();
		const parsed = leadSchema.safeParse(rawBody);

		if (!parsed.success) {
			return new Response(
				JSON.stringify({
					ok: false,
					error: 'Invalid payload',
					issues: parsed.error.issues.map((issue) => ({
						path: issue.path.join('.'),
						message: issue.message,
					})),
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		const routing = await routeLeadForManualReview(parsed.data);

		return new Response(
			JSON.stringify({
				ok: true,
				message: 'Lead submitted for manual review.',
				destination: routing.destination,
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Unexpected server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
