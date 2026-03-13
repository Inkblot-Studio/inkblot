export function getOrCreateRequestId(request: Request): string {
	const incoming = request.headers.get('x-request-id');
	if (incoming && incoming.trim().length > 0) return incoming;
	return crypto.randomUUID();
}
