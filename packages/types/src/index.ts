// ── Roles ─────────────────────────────────────────────────────
export type UserRole = 'syndic' | 'co_syndic' | 'co_owner' | 'renter'

// ── Profile ───────────────────────────────────────────────────
export interface Profile {
  id: string           // matches auth.users.id
  full_name: string
  email: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

// ── Building ──────────────────────────────────────────────────
export interface Building {
  id: string
  user_id: string      // syndic who owns this building
  name: string
  address: string
  city: string
  unit_count: number
  created_at: string
  updated_at: string
}

// ── Owner (co-owner or renter linked to a building) ───────────
export interface Owner {
  id: string
  building_id: string
  user_id?: string     // set once they accept their portal invite
  full_name: string
  email: string
  unit_number: string
  phone?: string
  is_renter: boolean
  created_at: string
}

// ── Charge ────────────────────────────────────────────────────
export type ChargeStatus = 'pending' | 'paid' | 'overdue'
export type ChargePeriod = 'monthly' | 'quarterly' | 'annual' | 'one_time'

export interface Charge {
  id: string
  building_id: string
  owner_id?: string
  title: string
  amount: number
  status: ChargeStatus
  period: ChargePeriod
  due_date: string
  paid_date?: string | null
  notes?: string
  created_at: string
}

// ── Document ──────────────────────────────────────────────────
export type DocumentCategory =
  | 'minutes'
  | 'budget'
  | 'contract'
  | 'insurance'
  | 'legal'
  | 'maintenance'
  | 'other'

export type DocumentVisibility = 'syndic_only' | 'all_residents'

export interface Document {
  id: string
  building_id: string
  name: string
  category: DocumentCategory
  visibility: DocumentVisibility
  file_url: string
  file_size?: number
  uploaded_by: string  // user_id
  created_at: string
}

// ── Notification ──────────────────────────────────────────────
export type NotificationType =
  | 'charge_overdue'
  | 'charge_paid'
  | 'new_document'
  | 'maintenance_request'
  | 'vote_opened'
  | 'vote_closed'
  | 'meeting_scheduled'
  | 'general'

export interface Notification {
  id: string
  user_id: string
  building_id?: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  created_at: string
}

// ── Workflow ──────────────────────────────────────────────────
export type WorkflowTrigger =
  | 'charge_overdue'
  | 'charge_due_soon'
  | 'new_owner'
  | 'ag_scheduled'
  | 'document_uploaded'
  | 'maintenance_request_submitted'

export type WorkflowAction =
  | 'send_email'
  | 'send_reminder'
  | 'create_notification'
  | 'send_email_template'

export interface Workflow {
  id: string
  user_id: string
  name: string
  trigger: WorkflowTrigger
  action: WorkflowAction
  active: boolean
  config?: Record<string, unknown>
  created_at: string
}

// ── Roadmap ───────────────────────────────────────────────────
export type RoadmapStatus   = 'planned' | 'in_progress' | 'done'
export type RoadmapPriority = 'low' | 'medium' | 'high'

export interface RoadmapItem {
  id: string
  building_id: string
  title: string
  description?: string
  status: RoadmapStatus
  priority: RoadmapPriority
  estimated_cost?: number
  target_date?: string
  created_at: string
}

// ── Meeting ───────────────────────────────────────────────────
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed'

export interface Meeting {
  id: string
  building_id: string
  title: string
  date: string
  status: MeetingStatus
  agenda?: string
  minutes?: string
  created_at: string
}

// ── Vote ──────────────────────────────────────────────────────
export type VoteStatus = 'open' | 'closed'

export interface Vote {
  id: string
  meeting_id: string
  building_id: string
  question: string
  status: VoteStatus
  yes_count: number
  no_count: number
  abstain_count: number
  created_at: string
}

export interface VoteCast {
  id: string
  vote_id: string
  user_id: string
  choice: 'yes' | 'no' | 'abstain'
  created_at: string
}

// ── Invitation ────────────────────────────────────────────────
export type InvitationStatus = 'pending' | 'accepted' | 'expired'

export interface Invitation {
  id: string
  building_id: string
  invited_by: string   // syndic user_id
  email: string
  role: Extract<UserRole, 'co_syndic' | 'co_owner' | 'renter'>
  unit_number?: string
  token: string        // unique token in the invite link
  status: InvitationStatus
  expires_at: string
  accepted_at?: string
  created_at: string
}

// ── Portal Access ─────────────────────────────────────────────
export interface PortalAccess {
  id: string
  user_id: string      // co-owner / renter
  building_id: string
  owner_id: string     // links to Owner record
  role: Extract<UserRole, 'co_owner' | 'renter'>
  granted_at: string
}

// ── Maintenance Request ───────────────────────────────────────
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent'

export interface MaintenanceRequest {
  id: string
  building_id: string
  submitted_by: string  // user_id (co-owner or renter)
  owner_id?: string
  title: string
  description: string
  status: MaintenanceStatus
  priority: MaintenancePriority
  unit_number?: string
  image_urls?: string[]
  resolved_at?: string
  created_at: string
  updated_at: string
}

// ── Payment Record (resident-facing) ─────────────────────────
export type PaymentMethod = 'bank_transfer' | 'direct_debit' | 'cash' | 'online'

export interface PaymentRecord {
  id: string
  charge_id: string
  building_id: string
  owner_id: string
  amount: number
  method: PaymentMethod
  reference?: string
  paid_at: string
  created_at: string
}

// ── AI Sage ───────────────────────────────────────────────────
export type AiMessageRole = 'user' | 'assistant'

export interface AiMessage {
  id: string
  role: AiMessageRole
  content: string
  created_at: string
}

export interface AiConversation {
  id: string
  user_id: string
  building_id?: string
  messages: AiMessage[]
  created_at: string
  updated_at: string
}
