# Incident Response Runbook

## Trigger Conditions

- `/api/lead` elevated 5xx errors
- Queue lag above threshold
- Worker failures spike

## Triage Steps

1. Check latest deployment revision:
   - `kubectl rollout history deployment/web-app -n inkblot-web-prod`
2. Check pod health and logs:
   - `kubectl get pods -n inkblot-web-prod`
   - `kubectl logs deploy/web-app -n inkblot-web-prod --tail=200`
   - `kubectl logs deploy/lead-worker -n inkblot-web-prod --tail=200`
3. Validate Redis and DB connectivity via env and service health.

## Immediate Mitigations

- Roll back deployments:
  - `bash infra/scripts/rollback.sh prod`
- Temporarily disable webhook routing by clearing `LEAD_WEBHOOK_URL`.

## Recovery Validation

- Submit a test lead.
- Confirm row exists in `leads` table.
- Confirm worker audit record created.
- Confirm no new critical alerts.
