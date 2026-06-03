-- ── Phase 3 — Communication ────────────────────────────────────
-- tickets, insurance_policies, insurance_claims,
-- contractors, supplier_contracts, letter_templates
-- + audit_log enum expansion

-- ── tickets ───────────────────────────────────────────────────
CREATE TABLE tickets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id  UUID        NOT NULL REFERENCES buildings(id)  ON DELETE CASCADE,
  organization_id UUID     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id      UUID        REFERENCES units(id)  ON DELETE SET NULL,
  owner_id     UUID        REFERENCES owners(id) ON DELETE SET NULL,
  submitted_by UUID        NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  type         TEXT        NOT NULL CHECK (type IN (
                             'complaint','charge_dispute','document_request',
                             'administrative','general_inquiry')),
  title        TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description  TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open','in_progress','resolved','closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX idx_tickets_building  ON tickets (building_id, status)     WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_submitter ON tickets (submitted_by)            WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_owner     ON tickets (owner_id)                WHERE deleted_at IS NULL;

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- syndic/co_syndic see all; residents see own
CREATE POLICY "tickets_syndic" ON tickets FOR ALL
  USING (is_member(building_id, ARRAY['syndic','co_syndic']));

CREATE POLICY "tickets_own" ON tickets FOR SELECT
  USING (submitted_by = auth.uid() OR
         is_member(building_id, ARRAY['syndic','co_syndic','co_owner','renter']));

CREATE POLICY "tickets_resident_insert" ON tickets FOR INSERT
  WITH CHECK (submitted_by = auth.uid() AND
              is_member(building_id, ARRAY['syndic','co_syndic','co_owner','renter']));

-- ── insurance_policies ────────────────────────────────────────
CREATE TABLE insurance_policies (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id           UUID        NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  organization_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  insurer_name          TEXT        NOT NULL CHECK (char_length(insurer_name) BETWEEN 1 AND 200),
  policy_number         TEXT        CHECK (char_length(policy_number) <= 100),
  type                  TEXT        NOT NULL CHECK (type IN (
                                      'fire','liability','omnium','elevator','legal','other')),
  description           TEXT,
  premium_annual        NUMERIC(12,2),
  start_date            DATE,
  end_date              DATE,
  renewal_reminder_days INT         NOT NULL DEFAULT 30,
  document_id           UUID        REFERENCES documents(id) ON DELETE SET NULL,
  contact_name          TEXT        CHECK (char_length(contact_name) <= 100),
  contact_email         TEXT        CHECK (char_length(contact_email) <= 200),
  contact_phone         TEXT        CHECK (char_length(contact_phone) <= 50),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_insurance_policies_building ON insurance_policies (building_id) WHERE deleted_at IS NULL;

ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insurance_policies_member" ON insurance_policies FOR ALL
  USING (is_member(building_id, ARRAY['syndic','co_syndic']));

CREATE POLICY "insurance_policies_owner_read" ON insurance_policies FOR SELECT
  USING (is_member(building_id, ARRAY['syndic','co_syndic','co_owner']));

-- ── insurance_claims ──────────────────────────────────────────
CREATE TABLE insurance_claims (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id      UUID        NOT NULL REFERENCES buildings(id)          ON DELETE CASCADE,
  organization_id  UUID        NOT NULL REFERENCES organizations(id)       ON DELETE CASCADE,
  policy_id        UUID        NOT NULL REFERENCES insurance_policies(id)  ON DELETE CASCADE,
  date             DATE        NOT NULL,
  description      TEXT        NOT NULL,
  amount_claimed   NUMERIC(12,2),
  amount_received  NUMERIC(12,2),
  status           TEXT        NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open','submitted','in_review','settled','rejected')),
  reference        TEXT        CHECK (char_length(reference) <= 100),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX idx_insurance_claims_building ON insurance_claims (building_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_insurance_claims_policy   ON insurance_claims (policy_id)   WHERE deleted_at IS NULL;

ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insurance_claims_member" ON insurance_claims FOR ALL
  USING (is_member(building_id, ARRAY['syndic','co_syndic']));

-- ── contractors ───────────────────────────────────────────────
CREATE TABLE contractors (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  trade           TEXT        NOT NULL CHECK (trade IN (
                                'plumber','electrician','elevator','cleaning','landscaping',
                                'painting','hvac','locksmith','general','other')),
  phone           TEXT        CHECK (char_length(phone) <= 50),
  email           TEXT        CHECK (char_length(email) <= 200),
  vat_number      TEXT        CHECK (char_length(vat_number) <= 30),
  address         TEXT,
  notes           TEXT,
  rating          INT         CHECK (rating BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_contractors_org ON contractors (organization_id) WHERE deleted_at IS NULL;

ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

-- Contractors are org-level — any member of the org can read
CREATE POLICY "contractors_read" ON contractors FOR SELECT
  USING (
    organization_id IN (
      SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "contractors_write" ON contractors FOR ALL
  USING (
    organization_id IN (
      SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

-- ── supplier_contracts ────────────────────────────────────────
CREATE TABLE supplier_contracts (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id           UUID        NOT NULL REFERENCES buildings(id)    ON DELETE CASCADE,
  organization_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contractor_id         UUID        NOT NULL REFERENCES contractors(id)   ON DELETE CASCADE,
  title                 TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description           TEXT,
  start_date            DATE,
  end_date              DATE,
  amount_annual         NUMERIC(12,2),
  status                TEXT        NOT NULL DEFAULT 'active'
                                      CHECK (status IN ('active','expired','cancelled','pending')),
  document_id           UUID        REFERENCES documents(id) ON DELETE SET NULL,
  renewal_reminder_days INT         NOT NULL DEFAULT 30,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_supplier_contracts_building    ON supplier_contracts (building_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_contracts_contractor  ON supplier_contracts (contractor_id) WHERE deleted_at IS NULL;

ALTER TABLE supplier_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_contracts_member" ON supplier_contracts FOR ALL
  USING (is_member(building_id, ARRAY['syndic','co_syndic']));

CREATE POLICY "supplier_contracts_owner_read" ON supplier_contracts FOR SELECT
  USING (is_member(building_id, ARRAY['syndic','co_syndic','co_owner']));

-- ── letter_templates ──────────────────────────────────────────
CREATE TABLE letter_templates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  building_id     UUID        REFERENCES buildings(id) ON DELETE CASCADE,  -- NULL = org-wide
  name            TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  category        TEXT        NOT NULL CHECK (category IN (
                                'financial','governance','maintenance','communication','legal')),
  body_html       TEXT        NOT NULL,
  variables       JSONB       NOT NULL DEFAULT '[]',   -- ["building_name","owner_name",...]
  is_default      BOOLEAN     NOT NULL DEFAULT FALSE,  -- TRUE = built-in template
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_letter_templates_org      ON letter_templates (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_letter_templates_building ON letter_templates (building_id)     WHERE deleted_at IS NULL;

ALTER TABLE letter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "letter_templates_syndic" ON letter_templates FOR ALL
  USING (
    organization_id IN (
      SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

-- ── Expand audit_log action enum ──────────────────────────────
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
  'bilan_export',
  -- Phase 3 — Communication
  'ticket_create', 'ticket_update', 'ticket_close',
  'insurance_policy_create', 'insurance_policy_update', 'insurance_policy_delete',
  'insurance_claim_create',  'insurance_claim_update',  'insurance_claim_delete',
  'contractor_create', 'contractor_update', 'contractor_delete',
  'supplier_contract_create', 'supplier_contract_update', 'supplier_contract_delete',
  'letter_template_create', 'letter_template_update', 'letter_template_delete',
  'letter_template_render',
  'impersonation_start', 'impersonation_end'
));
