// ── Invitations client API ──────────────────────────────────────

import { apiFetch } from '../../lib/api'

export interface Invitation {
  id:              string
  building_id:     string
  organization_id: string
  invited_by:      string
  email:           string
  role:            string
  unit_id:         string | null
  token:           string
  status:          'pending' | 'accepted' | 'expired'
  expires_at:      string
  accepted_at:     string | null
  created_at:      string
  deleted_at:      string | null
}

export async function fetchInvitations(buildingId: string): Promise<Invitation[]> {
  if (buildingId.startsWith('mock-')) return MOCK_INVITATIONS[buildingId] ?? []
  return apiFetch<Invitation[]>(`/api/v1/invitations?building_id=${buildingId}`, '')
}

export async function apiSendInvitation(
  token: string, buildingId: string,
  body: { email: string; role: string; unit_id?: string },
): Promise<Invitation> {
  return apiFetch<Invitation>(`/api/v1/invitations?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiRevokeInvitation(token: string, buildingId: string, id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/invitations/${id}?building_id=${buildingId}`, token, { method: 'DELETE' })
}

export async function apiValidateInviteToken(inviteToken: string): Promise<{
  email: string; role: string; building_id: string; building_name: string
}> {
  return apiFetch(`/api/v1/invitations/accept?token=${inviteToken}`, '')
}

export async function apiAcceptInvitation(authToken: string, inviteToken: string): Promise<{
  ok: boolean; building_id: string; role: string
}> {
  return apiFetch(`/api/v1/invitations/accept`, authToken, {
    method: 'POST', body: JSON.stringify({ token: inviteToken }),
  })
}

// ── Mock data ──────────────────────────────────────────────────
const MOCK_INVITATIONS: Record<string, Invitation[]> = {
  'mock-building-1': [
    {
      id: 'inv-1', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      invited_by: 'user-1', email: 'jean.dupont@example.com', role: 'co_owner',
      unit_id: null, token: 'mock-token-1',
      status: 'pending', expires_at: '2026-06-10T00:00:00Z',
      accepted_at: null, created_at: '2026-06-03T10:00:00Z', deleted_at: null,
    },
    {
      id: 'inv-2', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      invited_by: 'user-1', email: 'sophie.martin@example.com', role: 'renter',
      unit_id: null, token: 'mock-token-2',
      status: 'accepted', expires_at: '2026-06-08T00:00:00Z',
      accepted_at: '2026-06-04T09:00:00Z', created_at: '2026-06-01T10:00:00Z', deleted_at: null,
    },
  ],
}
