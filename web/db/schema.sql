CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY,
  payload JSONB NOT NULL,
  score INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'qualified', 'needs_info', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);

CREATE TABLE IF NOT EXISTS lead_audit (
  id UUID PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_audit_lead_id_idx ON lead_audit(lead_id);
