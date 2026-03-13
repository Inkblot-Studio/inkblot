import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry() {
	if (initialized) return;
	const dsn = import.meta.env.SENTRY_DSN;
	if (!dsn) return;

	Sentry.init({
		dsn,
		tracesSampleRate: 0.2,
		environment: import.meta.env.NODE_ENV ?? 'development',
	});
	initialized = true;
}

export function captureServerError(error: unknown, context?: Record<string, string>) {
	if (!initialized) return;
	Sentry.captureException(error, {
		tags: context,
	});
}
