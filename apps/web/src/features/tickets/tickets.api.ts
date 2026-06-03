// ── Tickets client API ─────────────────────────────────────────

import { supabase }       from '../../lib/supabase'
import { apiFetch }       from '../../lib/api'
import { MOCK_TICKETS }   from '../../lib/mockData'

export interface Ticket {
  id:              string
  building_id:     string
  organization_id: string
  unit_id:         string | null
  owner_id:        string | null
  submitted_by:    string
  type:            string
  title:           string
  description:     string
  status:          string
  created_at:      string
  updated_at:      string
}

export async function fetchTickets(buildingId: string): Promise<Ticket[]> {
  if (buildingId.startsWith('mock-')) {
    return MOCK_TICKETS[buildingId] ?? []
  }
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Ticket[]
}

export interface CreateTicketBody {
  type:        string
  title:       string
  description: string
  unit_id?:    string | null
  owner_id?:   string | null
}

export interface UpdateTicketBody {
  type?:        string
  title?:       string
  description?: string
  status?:      string
  unit_id?:     string | null
  owner_id?:    string | null
}

export async function apiCreateTicket(
  token: string, buildingId: string, body: CreateTicketBody,
): Promise<Ticket> {
  return apiFetch<Ticket>(`/api/v1/tickets?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiUpdateTicket(
  token: string, buildingId: string, id: string, body: UpdateTicketBody,
): Promise<Ticket> {
  return apiFetch<Ticket>(`/api/v1/tickets/${id}?building_id=${buildingId}`, token, {
    method: 'PATCH', body: JSON.stringify(body),
  })
}

export async function apiCloseTicket(
  token: string, buildingId: string, id: string,
): Promise<Ticket> {
  return apiFetch<Ticket>(`/api/v1/tickets/${id}/close?building_id=${buildingId}`, token, {
    method: 'POST',
  })
}
