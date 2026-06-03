import { z } from 'zod'

// ── Primitives ────────────────────────────────────────────────
const uuid     = z.string().uuid()
const isoDate  = z.string().datetime({ offset: true })
const optDate  = isoDate.nullable().optional()

// ── Field-level encryption ────────────────────────────────────
// Branded type for values encrypted by packages/crypto.
// TypeScript will refuse to assign a plain string where EncryptedString
// is required — enforces that raw values never reach the DB unencrypted.
export const EncryptedStringSchema = z.string().brand<'EncryptedString'>()
export type EncryptedString = z.infer<typeof EncryptedStringSchema>

// ── Shared API types ──────────────────────────────────────────

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data:        z.array(item),
    next_cursor: z.string().nullable(),
    has_more:    z.boolean(),
  })

export const ApiErrorSchema = z.object({
  code:    z.string(),
  message: z.string(),
  details: z.unknown().optional(),
})
export type ApiError = z.infer<typeof ApiErrorSchema>

export const LocaleSchema = z.enum(['en', 'fr', 'nl'])
export type Locale = z.infer<typeof LocaleSchema>

// ── Roles ─────────────────────────────────────────────────────
export const UserRoleSchema = z.enum(['syndic', 'co_syndic', 'co_owner', 'renter'])
export type UserRole = z.infer<typeof UserRoleSchema>

// ── Profile ───────────────────────────────────────────────────
export const ProfileSchema = z.object({
  id:         uuid,
  full_name:  z.string().min(1).max(100),
  email:      z.string().email(),
  avatar_url: z.string().url().optional(),
  phone:      EncryptedStringSchema.nullable().optional(),   // encrypted — decrypt before use
  created_at: isoDate,
})
export type Profile = z.infer<typeof ProfileSchema>

// ── Organization ──────────────────────────────────────────────
export const SubscriptionPlanSchema = z.enum(['free', 'starter', 'pro', 'enterprise'])
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>

export const OrganizationSchema = z.object({
  id:          uuid,
  name:        z.string().min(1).max(200),
  vat_number:  z.string().optional(),
  plan:        SubscriptionPlanSchema,
  created_at:  isoDate,
  deleted_at:  optDate,
})
export type Organization = z.infer<typeof OrganizationSchema>

// ── Building Member ───────────────────────────────────────────
export const BuildingMemberSchema = z.object({
  id:          uuid,
  building_id: uuid,
  user_id:     uuid,
  role:        UserRoleSchema,
  unit_id:     uuid.optional(),
  invited_by:  uuid.optional(),
  joined_at:   isoDate.optional(),
  created_at:  isoDate,
})
export type BuildingMember = z.infer<typeof BuildingMemberSchema>

// ── Building ──────────────────────────────────────────────────
export const BuildingTypeSchema = z.enum(['apartment', 'mixed', 'commercial', 'other'])
export type BuildingType = z.infer<typeof BuildingTypeSchema>

export const BuildingSchema = z.object({
  id:                   uuid,
  organization_id:      uuid,
  name:                 z.string().min(1).max(200),
  address:              z.string().min(1),
  city:                 z.string().min(1),
  unit_count:           z.number().int().nonnegative(),
  vme_number:           z.string().optional(),
  building_type:        BuildingTypeSchema.optional(),
  year_built:           z.number().int().optional(),
  floors:               z.number().int().optional(),
  ag_date:              z.string().nullable().optional(),
  mandate_start:        z.string().nullable().optional(),
  mandate_expiry:       z.string().nullable().optional(),
  annual_budget:        z.number().nonnegative().nullable().optional(),
  reserve_fund_balance: z.number().nonnegative().nullable().optional(),
  bank_iban:            z.string().nullable().optional(),
  bank_name:            z.string().nullable().optional(),
  auto_remind_enabled:  z.boolean().optional(),
  auto_remind_days:     z.number().int().optional(),
  created_at:           isoDate,
  updated_at:           isoDate,
  deleted_at:           optDate,
})
export type Building = z.infer<typeof BuildingSchema>

// ── Unit ─────────────────────────────────────────────────────
export const UnitTypeSchema = z.enum(['apartment', 'parking', 'storage', 'commercial', 'other'])
export type UnitType = z.infer<typeof UnitTypeSchema>

export const UnitSchema = z.object({
  id:              uuid,
  building_id:     uuid,
  unit_number:     z.string().min(1).max(20),
  floor:           z.number().int().optional(),
  unit_type:       UnitTypeSchema,
  ownership_share: z.number().nonnegative(),   // tantièmes
  created_at:      isoDate,
  deleted_at:      optDate,
})
export type Unit = z.infer<typeof UnitSchema>

// ── Owner ─────────────────────────────────────────────────────
export const OwnerSchema = z.object({
  id:                 uuid,
  building_id:        uuid,
  unit_id:            uuid,
  member_id:          uuid.optional(),
  full_name:          z.string().min(1).max(100),
  email:              z.string().email(),
  phone:              z.string().optional(),
  national_id:        EncryptedStringSchema.nullable().optional(),   // encrypted — decrypt before use
  is_renter:          z.boolean(),
  bank_account:       EncryptedStringSchema.nullable().optional(),   // encrypted — decrypt before use
  preferred_language: z.enum(['en', 'fr', 'nl']).optional(),
  mailing_address:    z.string().nullable().optional(),
  has_no_email:       z.boolean().optional(),
  created_at:         isoDate,
  deleted_at:         optDate,
})
export type Owner = z.infer<typeof OwnerSchema>

// ── Charge ────────────────────────────────────────────────────
export const ChargeStatusSchema = z.enum(['pending', 'paid', 'overdue'])
export type ChargeStatus = z.infer<typeof ChargeStatusSchema>

export const ChargePeriodSchema = z.enum(['monthly', 'quarterly', 'annual', 'one_time'])
export type ChargePeriod = z.infer<typeof ChargePeriodSchema>

export const ChargeSchema = z.object({
  id:          uuid,
  building_id: uuid,
  owner_id:    uuid.optional(),
  title:       z.string().min(1).max(200),
  amount:      z.number().nonnegative(),
  status:      ChargeStatusSchema,
  period:      ChargePeriodSchema,
  due_date:    z.string(),   // date string YYYY-MM-DD
  paid_date:   z.string().nullable().optional(),
  notes:       z.string().optional(),
  created_at:  isoDate,
  deleted_at:  optDate,
})
export type Charge = z.infer<typeof ChargeSchema>

// ── Accounting ────────────────────────────────────────────────

// Belgian PCMN accounting codes for VMEs — used in expense dropdown
export const BELGIAN_ACCOUNTING_CODES: Record<string, string> = {
  '61043': 'Électricité / Elektriciteit',
  '61050': 'Eau / Water',
  '61060': 'Gaz / Gas',
  '61070': 'Télécommunications / Telecommunicatie',
  '61100': 'Assurances / Verzekeringen',
  '61210': 'Entretien parties communes / Onderhoud gemeenschappelijke delen',
  '61220': 'Entretien ascenseur / Onderhoud lift',
  '61230': 'Nettoyage / Schoonmaak',
  '61240': 'Espaces verts / Groenaanleg',
  '61300': 'Services administratifs / Administratieve diensten',
  '61400': 'Honoraires syndic / Ereloon syndicus',
  '61500': 'Comptable / Boekhouder',
  '61600': 'Frais juridiques / Juridische kosten',
  '61700': 'Sécurité / Beveiliging',
  '61800': 'Réparations / Herstellingen',
  '61900': 'Autres services / Andere diensten',
  '6740':  'Frais bancaires / Bankkosten',
  '6750':  'Charges d\'intérêts / Rentelasten',
  '6800':  'Charges exceptionnelles / Uitzonderlijke lasten',
  'other': 'Autre / Andere',
}

export const ExpenseSchema = z.object({
  id:              uuid,
  building_id:     uuid,
  organization_id: uuid,
  date:            z.string(),   // YYYY-MM-DD
  description:     z.string().min(1).max(500),
  amount:          z.number().positive(),
  category:        z.string().min(1),
  supplier:        z.string().nullable().optional(),
  reference:       z.string().nullable().optional(),
  accounting_code: z.string(),
  notes:           z.string().nullable().optional(),
  deleted_at:      optDate,
  created_at:      isoDate,
})
export type Expense = z.infer<typeof ExpenseSchema>

export const IncomeTypeSchema = z.enum([
  'provision', 'subsidy', 'insurance_refund', 'interest', 'other',
])
export type IncomeType = z.infer<typeof IncomeTypeSchema>

export const IncomeSchema = z.object({
  id:              uuid,
  building_id:     uuid,
  organization_id: uuid,
  date:            z.string(),   // YYYY-MM-DD
  type:            IncomeTypeSchema,
  description:     z.string().min(1).max(500),
  amount:          z.number().positive(),
  owner_id:        uuid.nullable().optional(),
  reference:       z.string().nullable().optional(),
  notes:           z.string().nullable().optional(),
  deleted_at:      optDate,
  created_at:      isoDate,
})
export type Income = z.infer<typeof IncomeSchema>

export const BudgetLineSchema = z.object({
  id:              uuid,
  building_id:     uuid,
  organization_id: uuid,
  year:            z.number().int(),
  category:        z.string().min(1),
  description:     z.string().min(1).max(200),
  amount_budgeted: z.number().nonnegative(),
  created_at:      isoDate,
})
export type BudgetLine = z.infer<typeof BudgetLineSchema>

export const BilanSummarySchema = z.object({
  year:                   z.number().int(),
  building_id:            uuid,
  // ACTIF
  bank_vue:               z.number(),
  bank_epargne:           z.number(),
  total_receivables:      z.number(),   // sum of unpaid charges
  total_actif:            z.number(),
  // PASSIF
  reserve_fund_balance:   z.number(),
  total_income:           z.number(),
  total_expenses:         z.number(),
  net_result:             z.number(),   // total_income - total_expenses
  total_passif:           z.number(),
  // Breakdown
  expenses_by_code:       z.record(z.number()),   // accounting_code → total amount
})
export type BilanSummary = z.infer<typeof BilanSummarySchema>

// ── Document ──────────────────────────────────────────────────
export const DocumentCategorySchema = z.enum([
  'minutes', 'budget', 'contract', 'insurance', 'legal', 'maintenance', 'other',
])
export type DocumentCategory = z.infer<typeof DocumentCategorySchema>

export const DocumentVisibilitySchema = z.enum(['syndic_only', 'all_residents'])
export type DocumentVisibility = z.infer<typeof DocumentVisibilitySchema>

export const DocumentSchema = z.object({
  id:                uuid,
  building_id:       uuid,
  name:              z.string().min(1).max(255),
  category:          DocumentCategorySchema,
  visibility:        DocumentVisibilitySchema,
  storage_path:      z.string().min(1),   // UUID filename — never original
  file_size:         z.number().int().nonnegative().optional(),
  mime_type:         z.string().optional(),
  checksum:          z.string().optional(),
  uploaded_by:       uuid,
  virus_scanned_at:  isoDate.optional(),
  created_at:        isoDate,
  deleted_at:        optDate,
})
export type Document = z.infer<typeof DocumentSchema>

// ── Ticket ────────────────────────────────────────────────────
export const TicketTypeSchema = z.enum([
  'complaint', 'charge_dispute', 'document_request', 'administrative', 'general_inquiry',
])
export type TicketType = z.infer<typeof TicketTypeSchema>

export const TicketStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed'])
export type TicketStatus = z.infer<typeof TicketStatusSchema>

export const TicketSchema = z.object({
  id:           uuid,
  building_id:  uuid,
  unit_id:      uuid.optional(),
  owner_id:     uuid.optional(),
  submitted_by: uuid,
  type:         TicketTypeSchema,
  title:        z.string().min(1).max(200),
  description:  z.string().min(1),
  status:       TicketStatusSchema,
  created_at:   isoDate,
  updated_at:   isoDate,
  deleted_at:   optDate,
})
export type Ticket = z.infer<typeof TicketSchema>

// ── Insurance Policy ──────────────────────────────────────────
export const InsurancePolicyTypeSchema = z.enum([
  'fire', 'liability', 'omnium', 'elevator', 'legal', 'other',
])
export type InsurancePolicyType = z.infer<typeof InsurancePolicyTypeSchema>

export const InsurancePolicySchema = z.object({
  id:                    uuid,
  building_id:           uuid,
  organization_id:       uuid,
  insurer_name:          z.string().min(1).max(200),
  policy_number:         z.string().max(100).nullable().optional(),
  type:                  InsurancePolicyTypeSchema,
  description:           z.string().nullable().optional(),
  premium_annual:        z.number().nonnegative().nullable().optional(),
  start_date:            z.string().nullable().optional(),   // YYYY-MM-DD
  end_date:              z.string().nullable().optional(),
  renewal_reminder_days: z.number().int().nonnegative(),
  document_id:           uuid.nullable().optional(),
  contact_name:          z.string().max(100).nullable().optional(),
  contact_email:         z.string().max(200).nullable().optional(),
  contact_phone:         z.string().max(50).nullable().optional(),
  notes:                 z.string().nullable().optional(),
  created_at:            isoDate,
  updated_at:            isoDate,
  deleted_at:            optDate,
})
export type InsurancePolicy = z.infer<typeof InsurancePolicySchema>

// ── Insurance Claim ───────────────────────────────────────────
export const InsuranceClaimStatusSchema = z.enum([
  'open', 'submitted', 'in_review', 'settled', 'rejected',
])
export type InsuranceClaimStatus = z.infer<typeof InsuranceClaimStatusSchema>

export const InsuranceClaimSchema = z.object({
  id:              uuid,
  building_id:     uuid,
  organization_id: uuid,
  policy_id:       uuid,
  date:            z.string(),   // YYYY-MM-DD
  description:     z.string().min(1),
  amount_claimed:  z.number().nonnegative().nullable().optional(),
  amount_received: z.number().nonnegative().nullable().optional(),
  status:          InsuranceClaimStatusSchema,
  reference:       z.string().max(100).nullable().optional(),
  notes:           z.string().nullable().optional(),
  created_at:      isoDate,
  updated_at:      isoDate,
  deleted_at:      optDate,
})
export type InsuranceClaim = z.infer<typeof InsuranceClaimSchema>

// ── Contractor ────────────────────────────────────────────────
export const ContractorTradeSchema = z.enum([
  'plumber', 'electrician', 'elevator', 'cleaning', 'landscaping',
  'painting', 'hvac', 'locksmith', 'general', 'other',
])
export type ContractorTrade = z.infer<typeof ContractorTradeSchema>

export const ContractorSchema = z.object({
  id:              uuid,
  organization_id: uuid,
  name:            z.string().min(1).max(200),
  trade:           ContractorTradeSchema,
  phone:           z.string().max(50).nullable().optional(),
  email:           z.string().max(200).nullable().optional(),
  vat_number:      z.string().max(30).nullable().optional(),
  address:         z.string().nullable().optional(),
  notes:           z.string().nullable().optional(),
  rating:          z.number().int().min(1).max(5).nullable().optional(),
  created_at:      isoDate,
  deleted_at:      optDate,
})
export type Contractor = z.infer<typeof ContractorSchema>

// ── Supplier Contract ─────────────────────────────────────────
export const SupplierContractStatusSchema = z.enum([
  'active', 'expired', 'cancelled', 'pending',
])
export type SupplierContractStatus = z.infer<typeof SupplierContractStatusSchema>

export const SupplierContractSchema = z.object({
  id:                    uuid,
  building_id:           uuid,
  organization_id:       uuid,
  contractor_id:         uuid,
  title:                 z.string().min(1).max(200),
  description:           z.string().nullable().optional(),
  start_date:            z.string().nullable().optional(),   // YYYY-MM-DD
  end_date:              z.string().nullable().optional(),
  amount_annual:         z.number().nonnegative().nullable().optional(),
  status:                SupplierContractStatusSchema,
  document_id:           uuid.nullable().optional(),
  renewal_reminder_days: z.number().int().nonnegative(),
  notes:                 z.string().nullable().optional(),
  created_at:            isoDate,
  updated_at:            isoDate,
  deleted_at:            optDate,
})
export type SupplierContract = z.infer<typeof SupplierContractSchema>

// ── Letter Template ───────────────────────────────────────────
export const LetterTemplateCategorySchema = z.enum([
  'financial', 'governance', 'maintenance', 'communication', 'legal',
])
export type LetterTemplateCategory = z.infer<typeof LetterTemplateCategorySchema>

export const LetterTemplateSchema = z.object({
  id:              uuid,
  organization_id: uuid,
  building_id:     uuid.nullable().optional(),   // NULL = org-wide
  name:            z.string().min(1).max(200),
  category:        LetterTemplateCategorySchema,
  body_html:       z.string().min(1),
  variables:       z.array(z.string()),
  is_default:      z.boolean(),
  created_at:      isoDate,
  updated_at:      isoDate,
  deleted_at:      optDate,
})
export type LetterTemplate = z.infer<typeof LetterTemplateSchema>

// ── Notification ──────────────────────────────────────────────
export const NotificationTypeSchema = z.enum([
  'charge_overdue', 'charge_paid', 'new_document', 'maintenance_request',
  'vote_opened', 'vote_closed', 'meeting_scheduled', 'ticket_opened',
  'ticket_updated', 'general',
])
export type NotificationType = z.infer<typeof NotificationTypeSchema>

export const NotificationSchema = z.object({
  id:          uuid,
  user_id:     uuid,
  building_id: uuid.optional(),
  type:        NotificationTypeSchema,
  title:       z.string().min(1),
  body:        z.string().min(1),
  read:        z.boolean(),
  created_at:  isoDate,
})
export type Notification = z.infer<typeof NotificationSchema>

// ── Workflow ──────────────────────────────────────────────────
export const WorkflowTriggerSchema = z.enum([
  'charge_overdue', 'charge_due_soon', 'new_owner', 'ag_scheduled',
  'document_uploaded', 'maintenance_request_submitted',
])
export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>

export const WorkflowActionSchema = z.enum([
  'send_email', 'send_reminder', 'create_notification', 'send_email_template',
])
export type WorkflowAction = z.infer<typeof WorkflowActionSchema>

export const WorkflowSchema = z.object({
  id:              uuid,
  organization_id: uuid,
  building_id:     uuid.optional(),
  name:            z.string().min(1).max(200),
  trigger:         WorkflowTriggerSchema,
  action:          WorkflowActionSchema,
  active:          z.boolean(),
  config:          z.record(z.unknown()).optional(),
  created_at:      isoDate,
})
export type Workflow = z.infer<typeof WorkflowSchema>

// ── Roadmap ───────────────────────────────────────────────────
export const RoadmapStatusSchema   = z.enum(['planned', 'in_progress', 'done'])
export const RoadmapPrioritySchema = z.enum(['low', 'medium', 'high'])
export type RoadmapStatus   = z.infer<typeof RoadmapStatusSchema>
export type RoadmapPriority = z.infer<typeof RoadmapPrioritySchema>

export const RoadmapItemSchema = z.object({
  id:             uuid,
  building_id:    uuid,
  title:          z.string().min(1).max(200),
  description:    z.string().optional(),
  status:         RoadmapStatusSchema,
  priority:       RoadmapPrioritySchema,
  estimated_cost: z.number().nonnegative().optional(),
  target_date:    z.string().optional(),
  created_at:     isoDate,
  deleted_at:     optDate,
})
export type RoadmapItem = z.infer<typeof RoadmapItemSchema>

// ── Meeting ───────────────────────────────────────────────────
export const MeetingStatusSchema = z.enum(['scheduled', 'in_progress', 'completed'])
export type MeetingStatus = z.infer<typeof MeetingStatusSchema>

export const MeetingSchema = z.object({
  id:          uuid,
  building_id: uuid,
  title:       z.string().min(1).max(200),
  date:        isoDate,
  status:      MeetingStatusSchema,
  agenda:      z.string().optional(),
  minutes:     z.string().optional(),
  created_at:  isoDate,
  deleted_at:  optDate,
})
export type Meeting = z.infer<typeof MeetingSchema>

// ── Vote ──────────────────────────────────────────────────────
export const VoteStatusSchema = z.enum(['open', 'closed'])
export type VoteStatus = z.infer<typeof VoteStatusSchema>

export const VoteSchema = z.object({
  id:          uuid,
  meeting_id:  uuid,
  building_id: uuid,
  question:    z.string().min(1),
  status:      VoteStatusSchema,
  created_at:  isoDate,
})
export type Vote = z.infer<typeof VoteSchema>

export const VoteCastSchema = z.object({
  id:          uuid,
  vote_id:     uuid,
  user_id:     uuid,
  unit_id:     uuid,
  choice:      z.enum(['yes', 'no', 'abstain']),
  vote_weight: z.number().nonnegative(),   // snapshot of unit.ownership_share
  created_at:  isoDate,
})
export type VoteCast = z.infer<typeof VoteCastSchema>

// ── Invitation ────────────────────────────────────────────────
export const InvitationStatusSchema = z.enum(['pending', 'accepted', 'expired'])
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>

export const InvitationSchema = z.object({
  id:          uuid,
  building_id: uuid,
  invited_by:  uuid,
  email:       z.string().email(),
  role:        z.enum(['co_syndic', 'co_owner', 'renter']),
  unit_id:     uuid.optional(),
  token:       z.string().min(1),
  status:      InvitationStatusSchema,
  expires_at:  isoDate,
  accepted_at: isoDate.optional(),
  created_at:  isoDate,
  deleted_at:  optDate,
})
export type Invitation = z.infer<typeof InvitationSchema>

// ── Maintenance Request ───────────────────────────────────────
export const MaintenanceStatusSchema   = z.enum(['open', 'in_progress', 'resolved', 'closed'])
export const MaintenancePrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export type MaintenanceStatus   = z.infer<typeof MaintenanceStatusSchema>
export type MaintenancePriority = z.infer<typeof MaintenancePrioritySchema>

export const MaintenanceRequestSchema = z.object({
  id:           uuid,
  building_id:  uuid,
  unit_id:      uuid,
  submitted_by: uuid,
  owner_id:     uuid.optional(),
  title:        z.string().min(1).max(200),
  description:  z.string().min(1),
  status:       MaintenanceStatusSchema,
  priority:     MaintenancePrioritySchema,
  image_urls:   z.array(z.string().url()).optional(),
  resolved_at:  isoDate.optional(),
  created_at:   isoDate,
  updated_at:   isoDate,
  deleted_at:   optDate,
})
export type MaintenanceRequest = z.infer<typeof MaintenanceRequestSchema>

// ── Payment Record ────────────────────────────────────────────
export const PaymentMethodSchema = z.enum(['bank_transfer', 'direct_debit', 'cash', 'online'])
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>

export const PaymentRecordSchema = z.object({
  id:          uuid,
  charge_id:   uuid,
  building_id: uuid,
  owner_id:    uuid,
  amount:      z.number().nonnegative(),
  method:      PaymentMethodSchema,
  reference:   z.string().optional(),
  paid_at:     isoDate,
  created_at:  isoDate,
})
export type PaymentRecord = z.infer<typeof PaymentRecordSchema>

// ── Portal Access ─────────────────────────────────────────────
export const PortalAccessSchema = z.object({
  id:          uuid,
  user_id:     uuid,
  building_id: uuid,
  owner_id:    uuid,
  role:        z.enum(['co_owner', 'renter']),
  granted_at:  isoDate,
})
export type PortalAccess = z.infer<typeof PortalAccessSchema>

// ── Audit Log ─────────────────────────────────────────────────
export const AuditActionSchema = z.enum([
  'login_success', 'login_failure', 'mfa_challenge', 'logout', 'session_revoked',
  'document_download', 'document_upload', 'document_delete',
  'charge_create', 'charge_edit', 'charge_delete', 'charge_mark_paid',
  'owner_add', 'owner_remove', 'permission_change',
  'data_export', 'gdpr_access', 'gdpr_erasure', 'gdpr_export',
  'building_create', 'building_delete',
  'invitation_sent', 'unit_create', 'unit_delete',
  'org_update', 'access_denied',
  'ticket_create', 'ticket_update',
  'impersonation_start', 'impersonation_end',
])
export type AuditAction = z.infer<typeof AuditActionSchema>

export const AuditLogSchema = z.object({
  id:              uuid,
  actor_id:        uuid,
  action:          AuditActionSchema,
  resource_type:   z.string().min(1),
  resource_id:     uuid.optional(),
  building_id:     uuid.optional(),
  organization_id: uuid.optional(),
  ip_hash:         z.string().optional(),
  metadata:        z.record(z.unknown()).optional(),
  created_at:      isoDate,
})
export type AuditLog = z.infer<typeof AuditLogSchema>

// ── GDPR Request ──────────────────────────────────────────────
export const GdprRequestTypeSchema   = z.enum(['access', 'erasure', 'portability', 'rectification'])
export const GdprRequestStatusSchema = z.enum(['pending', 'processing', 'completed', 'denied'])
export type GdprRequestType   = z.infer<typeof GdprRequestTypeSchema>
export type GdprRequestStatus = z.infer<typeof GdprRequestStatusSchema>

export const GdprRequestSchema = z.object({
  id:              uuid,
  user_id:         uuid,
  organization_id: uuid,
  type:            GdprRequestTypeSchema,
  status:          GdprRequestStatusSchema,
  requested_at:    isoDate,
  deadline_at:     isoDate,   // requested_at + 30 days
  processed_by:    uuid.optional(),
  processed_at:    isoDate.optional(),
  notes:           z.string().optional(),
})
export type GdprRequest = z.infer<typeof GdprRequestSchema>

// ── Feature Flag ──────────────────────────────────────────────
export const FeatureFlagSchema = z.object({
  key:         z.string().min(1),
  enabled:     z.boolean(),
  description: z.string().optional(),
})
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>

// ── AI Sage ───────────────────────────────────────────────────
export const AiMessageRoleSchema = z.enum(['user', 'assistant'])
export type AiMessageRole = z.infer<typeof AiMessageRoleSchema>

export const AiMessageSchema = z.object({
  id:         uuid,
  role:       AiMessageRoleSchema,
  content:    z.string().min(1),
  created_at: isoDate,
})
export type AiMessage = z.infer<typeof AiMessageSchema>

export const AiConversationSchema = z.object({
  id:          uuid,
  user_id:     uuid,
  building_id: uuid.optional(),
  messages:    z.array(AiMessageSchema),
  created_at:  isoDate,
  updated_at:  isoDate,
})
export type AiConversation = z.infer<typeof AiConversationSchema>

// ── AI Results ────────────────────────────────────────────────
export const AIProviderSchema = z.enum(['anthropic', 'openai', 'local'])
export type AIProvider = z.infer<typeof AIProviderSchema>

export const AIExtractionSchema = z.object({
  id:             uuid,
  document_id:    uuid,
  building_id:    uuid,
  extracted_data: z.record(z.unknown()),
  model:          z.string().min(1),
  provider:       AIProviderSchema,
  confidence:     z.number().min(0).max(1).optional(),
  validated_by:   uuid.optional(),
  validated_at:   isoDate.optional(),
  created_at:     isoDate,
})
export type AIExtraction = z.infer<typeof AIExtractionSchema>

export const AISummarySchema = z.object({
  id:          uuid,
  document_id: uuid,
  building_id: uuid,
  summary:     z.string().min(1),
  model:       z.string().min(1),
  provider:    AIProviderSchema,
  created_at:  isoDate,
})
export type AISummary = z.infer<typeof AISummarySchema>

export const EmbeddingResourceTypeSchema = z.enum([
  'document', 'meeting_minutes', 'charge', 'maintenance_request', 'legal_article',
])
export type EmbeddingResourceType = z.infer<typeof EmbeddingResourceTypeSchema>

export const AIEmbeddingSchema = z.object({
  id:              uuid,
  resource_type:   EmbeddingResourceTypeSchema,
  resource_id:     uuid,
  building_id:     uuid,
  organization_id: uuid,
  embedding:       z.array(z.number()),
  model:           z.string().min(1),
  provider:        AIProviderSchema,
  created_at:      isoDate,
})
export type AIEmbedding = z.infer<typeof AIEmbeddingSchema>

// ── Worker Job ────────────────────────────────────────────────
export const WorkerJobTypeSchema = z.enum([
  'send_email', 'scan_file', 'generate_pdf', 'send_notification',
  'process_export', 'ai_extract', 'ai_summarize', 'ai_embed',
  'anomaly_detection',
])
export type WorkerJobType = z.infer<typeof WorkerJobTypeSchema>

export const WorkerJobSchema = z.object({
  type:    WorkerJobTypeSchema,
  payload: z.record(z.unknown()),
})
export type WorkerJob = z.infer<typeof WorkerJobSchema>

// ── Paginated Response (generic helper) ──────────────────────
export type PaginatedResponse<T> = {
  data:        T[]
  next_cursor: string | null
  has_more:    boolean
}
