import pino from 'pino';

export const logger = pino({
	level: import.meta.env.LOG_LEVEL ?? 'info',
	base: undefined,
	timestamp: pino.stdTimeFunctions.isoTime,
});
