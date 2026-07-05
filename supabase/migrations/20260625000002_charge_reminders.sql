-- ── Charge reminder log ───────────────────────────────────────
-- Tracks which reminder emails have been sent for each charge.
-- UNIQUE(charge_id, sent_date) prevents duplicate sends on the same day.

CREATE TABLE IF NOT EXISTS charge_reminder_log (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id    UUID    NOT NULL REFERENCES charges ON DELETE CASCADE,
  building_id  UUID    NOT NULL REFERENCES buildings ON DELETE CASCADE,
  owner_email  TEXT    NOT NULL,
  sent_date    DATE    NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (charge_id, sent_date)
);

CREATE INDEX IF NOT EXISTS idx_reminder_log_charge   ON charge_reminder_log (charge_id);
CREATE INDEX IF NOT EXISTS idx_reminder_log_building ON charge_reminder_log (building_id);
CREATE INDEX IF NOT EXISTS idx_reminder_log_sent     ON charge_reminder_log (sent_date);

ALTER TABLE charge_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminder_log_staff" ON charge_reminder_log
  FOR ALL USING (is_member(building_id, ARRAY['syndic','co_syndic']));
