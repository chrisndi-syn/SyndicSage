-- ─────────────────────────────────────────────────────────────
-- Phase 8 — Customer Acquisition & Billing
-- • stripe_customer_id + stripe_subscription_id on organizations
-- • trial_ends_at for future trial support
-- • Expand audit_log with billing actions
-- ─────────────────────────────────────────────────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at          TIMESTAMPTZ;

-- ── Expand audit_log allowed actions ─────────────────────────
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
  'security_alert',
  'settings_updated',
  'member_removed',
  'gdpr_request_processed',
  -- Phase 8 — Billing
  'billing.checkout_created',
  'billing.subscription_activated'
));
