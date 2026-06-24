// ── Messages client API ─────────────────────────────────────────

import { apiFetch } from '../../lib/api'

export interface Message {
  id:              string
  building_id:     string
  organization_id: string
  sender_user_id:  string
  thread_id:       string
  subject:         string | null
  body:            string
  read_at:         string | null
  created_at:      string
}

export async function fetchMessages(buildingId: string): Promise<Message[]> {
  return apiFetch<Message[]>(`/api/v1/messages?building_id=${buildingId}`, '')
}

export async function apiSendMessage(
  token: string, buildingId: string,
  body: { body: string; subject?: string; thread_id?: string },
): Promise<Message> {
  return apiFetch<Message>(`/api/v1/messages?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiMarkRead(token: string, buildingId: string, id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/messages/${id}/read?building_id=${buildingId}`, token, { method: 'PATCH' })
}

