-- ─────────────────────────────────────────────────────────────
-- Phase 7 — Settings / Admin Console
-- • Expand audit_log action enum with settings/admin actions
-- ─────────────────────────────────────────────────────────────

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
  -- Phase 7 — Settings / Admin Console
  'settings_updated',
  'member_removed',
  'gdpr_request_processed'
));
