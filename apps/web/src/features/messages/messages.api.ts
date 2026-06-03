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
  if (buildingId.startsWith('mock-')) return MOCK_MESSAGES[buildingId] ?? []
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

// ── Mock data ──────────────────────────────────────────────────
const MOCK_MESSAGES: Record<string, Message[]> = {
  'mock-building-1': [
    {
      id: 'msg-1', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      sender_user_id: 'resident-1', thread_id: 'msg-1',
      subject: 'Bruit au 3ème étage', body: 'Bonjour, des bruits importants viennent de l\'appartement 3B depuis plusieurs nuits. Pourriez-vous intervenir ?',
      read_at: null, created_at: '2026-06-02T14:30:00Z',
    },
    {
      id: 'msg-2', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      sender_user_id: 'syndic-1', thread_id: 'msg-1',
      subject: null, body: 'Bonjour, merci pour votre signalement. Nous avons contacté l\'occupant et la situation devrait être résolue rapidement.',
      read_at: '2026-06-03T09:00:00Z', created_at: '2026-06-03T08:45:00Z',
    },
    {
      id: 'msg-3', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      sender_user_id: 'resident-2', thread_id: 'msg-3',
      subject: 'Question sur les charges Q2', body: 'Pourriez-vous m\'expliquer la charge pour l\'ascenseur ce trimestre ?',
      read_at: null, created_at: '2026-06-01T11:00:00Z',
    },
  ],
}
