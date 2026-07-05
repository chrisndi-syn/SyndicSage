-- ── Maintenance tasks ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS syndic_maintenance_tasks (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id         UUID        NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  organization_id     UUID        NOT NULL,
  title               TEXT        NOT NULL,
  description         TEXT,
  category            TEXT        NOT NULL DEFAULT 'other',
  priority            TEXT        NOT NULL DEFAULT 'medium',
  frequency           TEXT        NOT NULL DEFAULT 'annual',
  next_due_date       DATE,
  last_done_date      DATE,
  remind_days_before  INT         NOT NULL DEFAULT 14,
  supplier_name       TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

ALTER TABLE syndic_maintenance_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "syndic_maintenance_tasks_org" ON syndic_maintenance_tasks
  USING (organization_id = (
    SELECT organization_id FROM building_members
    WHERE user_id = auth.uid() LIMIT 1
  ));
