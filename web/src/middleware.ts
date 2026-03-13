import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
	const response = await next();
	const requestId = context.request.headers.get('x-request-id') ?? crypto.randomUUID();
	response.headers.set('x-request-id', requestId);
	return response;
});
