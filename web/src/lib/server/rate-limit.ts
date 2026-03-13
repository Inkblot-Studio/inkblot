type Entry = { count: number; resetAt: number };

const bucket = new Map<string, Entry>();

const WINDOW_MS = 60_000;
const LIMIT = 20;

export function isRateLimited(key: string): boolean {
	const now = Date.now();
	const current = bucket.get(key);

	if (!current || current.resetAt < now) {
		bucket.set(key, { count: 1, resetAt: now + WINDOW_MS });
		return false;
	}

	current.count += 1;
	bucket.set(key, current);
	return current.count > LIMIT;
}
