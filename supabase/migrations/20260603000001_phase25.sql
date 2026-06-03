-- ─────────────────────────────────────────────────────────────
-- SyndicSage V5 — Phase 2.5 Migration
--
-- Adds:
-- • national_id (encrypted) on owners
-- • phone (encrypted) on profiles
-- • gdpr_requests table
-- • Expanded audit_log action enum (GDPR + security events)
-- ─────────────────────────────────────────────────────────────

-- ── Encrypted fields ──────────────────────────────────────────
-- These columns store AES-256-GCM ciphertext from packages/crypto.
-- Never insert plaintext — always encrypt via the API layer first.

ALTER TABLE owners   ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone       TEXT;

-- ── GDPR Requests ─────────────────────────────────────────────
-- Tracks right-to-access, erasure, portability, and rectification requests.
-- Insert-only by users (self-service or syndic-triggered).
-- Syndics update status. Immutable once completed.
-- 30-day deadline enforced by Hono worker job (day-25 reminder).
CREATE TABLE gdpr_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  organization_id  UUID        NOT NULL REFERENCES organizations ON DELETE CASCADE,
  type             TEXT        NOT NULL CHECK (type IN (
                                 'access', 'erasure', 'portability', 'rectification'
                               )),
  status           TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN (
                                 'pending', 'processing', 'completed', 'denied'
                               )),
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 30-day deadline per GDPR Article 12
  deadline_at      TIMESTAMPTZ NOT NULL GENERATED ALWAYS AS
                               (requested_at + INTERVAL '30 days') STORED,
  processed_by     UUID        REFERENCES auth.users,
  processed_at     TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;

-- Users can submit their own requests
CREATE POLICY "gdpr_requests_insert" ON gdpr_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users see own requests; syndics see requests in their org
CREATE POLICY "gdpr_requests_select" ON gdpr_requests
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM building_members bm
      JOIN profiles p ON p.id = auth.uid()
      WHERE bm.user_id = auth.uid()
        AND bm.role    = 'syndic'
        AND p.organization_id = gdpr_requests.organization_id
    )
  );

-- Only syndics can update status (set processing/completed/denied)
CREATE POLICY "gdpr_requests_update" ON gdpr_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM building_members bm
      JOIN profiles p ON p.id = auth.uid()
      WHERE bm.user_id = auth.uid()
        AND bm.role    = 'syndic'
        AND p.organization_id = gdpr_requests.organization_id
    )
  );

CREATE INDEX idx_gdpr_requests_user     ON gdpr_requests (user_id);
CREATE INDEX idx_gdpr_requests_org      ON gdpr_requests (organization_id, status);
-- Used by the deadline-enforcement job to find overdue open requests
CREATE INDEX idx_gdpr_requests_deadline ON gdpr_requests (deadline_at)
  WHERE status IN ('pending', 'processing');

-- ── Expand audit_log action enum ─────────────────────────────
-- Replaces the Phase 2 constraint, adding GDPR + security events.
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
  'gdpr_rectification', 'gdpr_consent_grant', 'gdpr_consent_withdrawal'
));
