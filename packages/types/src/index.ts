// ── Building ─────────────────────────────────────────────────
export interface Building {
  id: string
  user_id: string
  name: string
  address: string
  city: string
  unit_count: number
  created_at: string
  updated_at: string
}

// ── Owner ────────────────────────────────────────────────────
export interface Owner {
  id: string
  building_id: string
  full_name: string
  email: string
  unit_number: string
  phone?: string
  is_renter: boolean
  created_at: string
}

// ── Charge ───────────────────────────────────────────────────
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

// ── Document ─────────────────────────────────────────────────
export interface Document {
  id: string
  building_id: string
  name: string
  category: string
  file_url: string
  file_size?: number
  uploaded_by: string
  created_at: string
}

// ── Notification ─────────────────────────────────────────────
export interface Notification {
  id: string
  user_id: string
  building_id?: string
  title: string
  body: string
  read: boolean
  created_at: string
}

// ── Workflow ─────────────────────────────────────────────────
export type WorkflowTrigger =
  | 'charge_overdue'
  | 'charge_due_soon'
  | 'new_owner'
  | 'ag_scheduled'
  | 'document_uploaded'

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

// ── Roadmap ──────────────────────────────────────────────────
export type RoadmapStatus = 'planned' | 'in_progress' | 'done'
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

// ── Meeting ──────────────────────────────────────────────────
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

// ── Vote ─────────────────────────────────────────────────────
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
