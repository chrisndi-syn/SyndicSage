-- ─────────────────────────────────────────────────────────────
-- SyndicSage V5 — Phase 2.6 Migration: Accounting
--
-- Belgian VME law requires syndics to maintain expense ledgers,
-- income records, and present an annual bilan to co-owners at the AG.
--
-- Adds:
-- • bank_vue, bank_epargne, starting_balance on buildings
-- • expenses table (Belgian accounting codes)
-- • income table
-- • budget_lines table
-- • Expanded audit_log action enum (accounting events)
-- ─────────────────────────────────────────────────────────────

-- ── Accounting columns on buildings ──────────────────────────
-- reserve_fund_balance already added in profile_fields migration
ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS bank_vue         NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bank_epargne     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS starting_balance NUMERIC(12,2);

-- ── Expenses ──────────────────────────────────────────────────
-- One row per expense. accounting_code follows Belgian PCMN (Plan Comptable
-- Minimum Normalisé) for VMEs. Soft delete — syndics are legally accountable.
CREATE TABLE expenses (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id      UUID         NOT NULL REFERENCES buildings  ON DELETE RESTRICT,
  organization_id  UUID         NOT NULL REFERENCES organizations ON DELETE RESTRICT,
  date             DATE         NOT NULL,
  description      TEXT         NOT NULL,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category         TEXT         NOT NULL,
  supplier         TEXT,
  reference        TEXT,
  accounting_code  TEXT         NOT NULL DEFAULT 'other',
  notes            TEXT,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_building ON expenses (building_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_org      ON expenses (organization_id)        WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_code     ON expenses (building_id, accounting_code, date DESC) WHERE deleted_at IS NULL;

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_select" ON expenses FOR SELECT USING (
  is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT WITH CHECK (
  is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "expenses_update" ON expenses FOR UPDATE USING (
  is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "expenses_delete" ON expenses FOR UPDATE USING (
  is_member(building_id, ARRAY['syndic','co_syndic'])
);

-- ── Income ────────────────────────────────────────────────────
-- Provisions, subsidies, insurance refunds, interest, other income.
CREATE TABLE income (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id      UUID         NOT NULL REFERENCES buildings     ON DELETE RESTRICT,
  organization_id  UUID         NOT NULL REFERENCES organizations ON DELETE RESTRICT,
  date             DATE         NOT NULL,
  type             TEXT         NOT NULL CHECK (type IN (
                                  'provision','subsidy','insurance_refund','interest','other'
                                )),
  description      TEXT         NOT NULL,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  owner_id         UUID         REFERENCES owners ON DELETE SET NULL,  -- for provisions
  reference        TEXT,
  notes            TEXT,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_income_building ON income (building_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_income_org      ON income (organization_id)        WHERE deleted_at IS NULL;

ALTER TABLE income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "income_select" ON income FOR SELECT USING (
  is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "income_insert" ON income FOR INSERT WITH CHECK (
  is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "income_update" ON income FOR UPDATE USING (
  is_member(building_id, ARRAY['syndic','co_syndic'])
);

-- ── Budget Lines ──────────────────────────────────────────────
-- One row per budget category per year. Actual vs budgeted
-- computed at query time by grouping expenses by category.
CREATE TABLE budget_lines (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id      UUID         NOT NULL REFERENCES buildings     ON DELETE RESTRICT,
  organization_id  UUID         NOT NULL REFERENCES organizations ON DELETE RESTRICT,
  year             SMALLINT     NOT NULL CHECK (year >= 2000 AND year <= 2100),
  category         TEXT         NOT NULL,
  description      TEXT         NOT NULL,
  amount_budgeted  NUMERIC(12,2) NOT NULL CHECK (amount_budgeted >= 0),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (building_id, year, category)
);

CREATE INDEX idx_budget_lines_building ON budget_lines (building_id, year);

ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_lines_select" ON budget_lines FOR SELECT USING (
  is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "budget_lines_insert" ON budget_lines FOR INSERT WITH CHECK (
  is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "budget_lines_update" ON budget_lines FOR UPDATE USING (
  is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "budget_lines_delete" ON budget_lines FOR DELETE USING (
  is_member(building_id, ARRAY['syndic','co_syndic'])
);

-- ── Expand audit_log action enum ─────────────────────────────
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;

ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check CHECK (action IN (
  -- Auth
  'login', 'login_success', 'login_failure', 'logout',
  'mfa_challenge', 'session_revoked',
  -- Documents
  'document_download', 'document_upload', 'document_delete',
  -- Charges
  'charge_create', 'charge_edit', 'charge_delete', 'charge_mark_paid',
  -- Owners
  'owner_add', 'owner_update', 'owner_remove',
  -- Buildings
  'building_create', 'building_update', 'building_delete',
  -- Members
  'member_add', 'member_remove',
  -- Invitations
  'invitation_sent',
  -- Units
  'unit_create', 'unit_delete',
  -- Org
  'org_update',
  -- Security
  'permission_change', 'data_export', 'access_denied', 'security_alert',
  -- GDPR
  'gdpr_access', 'gdpr_erasure', 'gdpr_export',
  'gdpr_rectification', 'gdpr_consent_grant', 'gdpr_consent_withdrawal',
  -- Accounting
  'expense_create', 'expense_update', 'expense_delete',
  'income_create',  'income_update',  'income_delete',
  'budget_line_create', 'budget_line_update', 'budget_line_delete',
  'bilan_export'
));
