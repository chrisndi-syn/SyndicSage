-- ─────────────────────────────────────────────────────────────
-- SyndicSage V5 — Phase 2 Migration
--
-- Adds:
-- • feature_flags table (kill switches for safe rollouts)
-- • vme_number on buildings (KBO registration guide)
-- • Expanded audit_log action enum (building_update, member_remove, etc.)
-- ─────────────────────────────────────────────────────────────

-- ── Feature Flags ─────────────────────────────────────────────
CREATE TABLE feature_flags (
  key         TEXT    PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read flags (middleware checks them)
CREATE POLICY "feature_flags_read" ON feature_flags
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only syndics can toggle flags (via Settings/Admin Console)
CREATE POLICY "feature_flags_write" ON feature_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE user_id = auth.uid() AND role = 'syndic'
    )
  );

-- Default flags — all enabled at launch
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('uploads_enabled',  true, 'Allow document uploads'),
  ('logins_enabled',   true, 'Allow new user logins'),
  ('exports_enabled',  true, 'Allow data exports');

-- ── KBO number on buildings ───────────────────────────────────
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS vme_number TEXT;

-- ── Expand audit_log allowed actions ─────────────────────────
-- Drop old constraint and replace with extended set
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;

ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check CHECK (action IN (
  -- Auth
  'login', 'logout',
  -- Documents
  'document_download', 'document_upload', 'document_delete',
  -- Charges
  'charge_create', 'charge_edit', 'charge_delete', 'charge_mark_paid',
  -- Owners
  'owner_add', 'owner_remove',
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
  'permission_change', 'data_export', 'access_denied', 'session_revoked'
));
