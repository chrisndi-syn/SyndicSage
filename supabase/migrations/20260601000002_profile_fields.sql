-- ── Phase 2 profile fields ────────────────────────────────────
-- Adds extra fields to buildings and owners matching V4 feature set.

-- ── Buildings extra fields ────────────────────────────────────
ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS building_type      TEXT CHECK (building_type IN ('apartment','mixed','commercial','other')),
  ADD COLUMN IF NOT EXISTS year_built         SMALLINT,
  ADD COLUMN IF NOT EXISTS floors             SMALLINT,
  ADD COLUMN IF NOT EXISTS ag_date            DATE,
  ADD COLUMN IF NOT EXISTS mandate_start      DATE,
  ADD COLUMN IF NOT EXISTS mandate_expiry     DATE,
  ADD COLUMN IF NOT EXISTS annual_budget      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS reserve_fund_balance NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS bank_iban          TEXT,
  ADD COLUMN IF NOT EXISTS bank_name          TEXT,
  ADD COLUMN IF NOT EXISTS auto_remind_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_remind_days   SMALLINT NOT NULL DEFAULT 7;

-- ── Owners extra fields ───────────────────────────────────────
ALTER TABLE owners
  ADD COLUMN IF NOT EXISTS bank_account        TEXT,
  ADD COLUMN IF NOT EXISTS preferred_language  TEXT NOT NULL DEFAULT 'fr' CHECK (preferred_language IN ('en','fr','nl')),
  ADD COLUMN IF NOT EXISTS mailing_address     TEXT,
  ADD COLUMN IF NOT EXISTS has_no_email        BOOLEAN NOT NULL DEFAULT FALSE;
