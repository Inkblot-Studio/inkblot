# Lead Flow Verification Runbook

## Pre-check

- `DATABASE_URL` and `REDIS_URL` configured.
- Worker deployment running.
- Webhook endpoint configured or noop adapter expected.

## Verification Steps

1. Submit strategy call form in staging.
2. Check API response contains `leadId`.
3. Confirm lead persisted:
   - `SELECT id, status, score FROM leads ORDER BY created_at DESC LIMIT 5;`
4. Confirm audit entries:
   - `SELECT lead_id, message FROM lead_audit ORDER BY created_at DESC LIMIT 10;`
5. Confirm queue consumption by worker logs.

## Expected Status Lifecycle

- Initial: `new` or `needs_info` or `qualified` based on score
- Worker route executed with audit message attached

## Failure Handling

- If persistence fails: check DB connection string and migrations.
- If queue not consuming: check worker logs and Redis connectivity.
- If webhook fails: fallback to noop adapter and retry from audit queue.
