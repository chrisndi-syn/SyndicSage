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

