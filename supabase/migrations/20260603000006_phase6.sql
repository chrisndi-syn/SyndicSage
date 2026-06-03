-- ─────────────────────────────────────────────────────────────
-- SyndicSage V5 — Phase 6: Resident Portal
--
-- New tables: messages, payment_transactions
-- Alter: invitations gets organization_id
-- ─────────────────────────────────────────────────────────────

-- ── Add organization_id to invitations ───────────────────────
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations ON DELETE CASCADE;

UPDATE invitations i
SET organization_id = b.organization_id
FROM buildings b
WHERE b.id = i.building_id
  AND i.organization_id IS NULL;

-- ── Messages ──────────────────────────────────────────────────
-- Threaded in-app messaging: residents ↔ syndic.
-- thread_id is set to the first message's id for all replies.
CREATE TABLE IF NOT EXISTS messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id       UUID        NOT NULL REFERENCES buildings ON DELETE CASCADE,
  organization_id   UUID        NOT NULL REFERENCES organizations ON DELETE CASCADE,
  sender_user_id    UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  thread_id         UUID        NOT NULL,   -- = id of the first message in thread
  subject           TEXT,                   -- only set on thread-opening message
  body              TEXT        NOT NULL,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_building  ON messages (building_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread    ON messages (thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender    ON messages (sender_user_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_members" ON messages
  FOR ALL USING (is_member(building_id, ARRAY['syndic','co_syndic','co_owner','renter']));

-- ── Payment Transactions ──────────────────────────────────────
-- Records Mollie (or future Stripe) payment attempts for charges.
CREATE TABLE IF NOT EXISTS payment_transactions (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id               UUID          NOT NULL REFERENCES charges ON DELETE RESTRICT,
  building_id             UUID          NOT NULL REFERENCES buildings ON DELETE CASCADE,
  organization_id         UUID          NOT NULL REFERENCES organizations ON DELETE CASCADE,
  user_id                 UUID          NOT NULL REFERENCES auth.users,
  provider                TEXT          NOT NULL DEFAULT 'mollie'
                                        CHECK (provider IN ('mollie','stripe')),
  provider_payment_id     TEXT,         -- Mollie payment ID
  checkout_url            TEXT,         -- redirect resident to this
  status                  TEXT          NOT NULL DEFAULT 'pending'
                                        CHECK (status IN ('pending','open','paid','failed','expired','cancelled','refunded')),
  amount                  NUMERIC(10,2) NOT NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_charge   ON payment_transactions (charge_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_building ON payment_transactions (building_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user     ON payment_transactions (user_id);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
-- Residents see only their own payments; syndic sees all for building
CREATE POLICY "payment_transactions_own" ON payment_transactions
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_member(building_id, ARRAY['syndic','co_syndic'])
  );
CREATE POLICY "payment_transactions_insert" ON payment_transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "payment_transactions_update_syndic" ON payment_transactions
  FOR UPDATE USING (is_member(building_id, ARRAY['syndic','co_syndic']));

-- ── Expand audit_log action enum ─────────────────────────────
DO $$ BEGIN
  -- invitation events
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'invitation_accepted'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'text')
  ) THEN NULL; END IF;
END $$;

-- Note: audit_log.action is a TEXT column with CHECK constraint.
-- Phase 2.5 migration expanded the enum — new values added here:
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check CHECK (action IN (
  'login','logout',
  'document_download','document_upload','document_delete',
  'charge_create','charge_edit','charge_delete','charge_mark_paid',
  'owner_add','owner_remove',
  'permission_change','data_export',
  'building_create','building_delete',
  'invitation_sent','invitation_accepted','invitation_revoked',
  'unit_create','unit_delete',
  'org_update',
  'meeting.created','meeting.updated','meeting.deleted','meeting.started','meeting.ended',
  'vote.created','vote.cast','vote.closed',
  'roadmap_item.created','roadmap_item.updated','roadmap_item.deleted',
  'ticket.created','ticket.updated','ticket.closed',
  'expense.created','expense.updated','expense.deleted',
  'income.created','income.updated','income.deleted',
  'budget_line.created','budget_line.updated','budget_line.deleted',
  'insurance_policy.created','insurance_policy.updated','insurance_policy.deleted',
  'insurance_claim.created','insurance_claim.updated','insurance_claim.deleted',
  'contractor.created','contractor.updated','contractor.deleted',
  'supplier_contract.created','supplier_contract.updated','supplier_contract.deleted',
  'letter_template.created','letter_template.updated','letter_template.deleted',
  'message.sent',
  'payment.initiated','payment.confirmed','payment.failed',
  'security_alert'
));
