// ── Tickets repository layer ──────────────────────────────────

import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { Errors }           from '../../shared/errors.js'

export interface TicketRow {
  id:           string
  building_id:  string
  organization_id: string
  unit_id:      string | null
  owner_id:     string | null
  submitted_by: string
  type:         string
  title:        string
  description:  string
  status:       string
  created_at:   string
  updated_at:   string
}

const VALID_TICKET_TYPES   = ['complaint','charge_dispute','document_request','administrative','general_inquiry'] as const
const VALID_TICKET_STATUSES = ['open','in_progress','resolved','closed'] as const
export type TicketType   = typeof VALID_TICKET_TYPES[number]
export type TicketStatus = typeof VALID_TICKET_STATUSES[number]

export function isValidTicketType(v: string): v is TicketType {
  return (VALID_TICKET_TYPES as readonly string[]).includes(v)
}
export function isValidTicketStatus(v: string): v is TicketStatus {
  return (VALID_TICKET_STATUSES as readonly string[]).includes(v)
}

export async function listTickets(buildingId: string): Promise<TicketRow[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw Errors.internal()
  return (data ?? []) as TicketRow[]
}

export async function listOwnTickets(buildingId: string, userId: string): Promise<TicketRow[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('building_id', buildingId)
    .eq('submitted_by', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw Errors.internal()
  return (data ?? []) as TicketRow[]
}

export interface CreateTicketInput {
  building_id:     string
  organization_id: string
  submitted_by:    string
  type:            TicketType
  title:           string
  description:     string
  unit_id?:        string | null
  owner_id?:       string | null
}

export async function createTicket(input: CreateTicketInput): Promise<TicketRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('tickets')
    .insert(input)
    .select()
    .single()

  if (error || !data) throw Errors.internal()
  return data as TicketRow
}

export interface UpdateTicketInput {
  title?:       string
  description?: string
  status?:      TicketStatus
}

export async function updateTicket(
  ticketId:   string,
  buildingId: string,
  input:      UpdateTicketInput,
): Promise<TicketRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('tickets')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', ticketId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) throw Errors.notFound('Ticket')
  return data as TicketRow
}

export async function closeTicket(ticketId: string, buildingId: string): Promise<TicketRow> {
  return updateTicket(ticketId, buildingId, { status: 'closed' })
}
