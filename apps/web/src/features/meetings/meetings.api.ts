// ── Meetings + Votes client API ─────────────────────────────────

import { apiFetch } from '../../lib/api'

export interface Meeting {
  id:              string
  building_id:     string
  organization_id: string
  title:           string
  date:            string
  agenda:          string | null
  status:          'scheduled' | 'in_progress' | 'completed'
  daily_room_name: string | null
  daily_room_url:  string | null
  transcript:      string | null
  minutes:         string | null
  started_at:      string | null
  ended_at:        string | null
  created_at:      string
  updated_at:      string
  deleted_at:      string | null
}

export interface Vote {
  id:              string
  meeting_id:      string
  building_id:     string
  organization_id: string
  question:        string
  description:     string | null
  status:          'open' | 'closed'
  vote_opened_at:  string | null
  vote_closed_at:  string | null
  created_at:      string
  vote_casts:      VoteCast[]
}

export interface VoteCast {
  id:          string
  vote_id:     string
  user_id:     string
  unit_id:     string
  choice:      'yes' | 'no' | 'abstain'
  vote_weight: number
  created_at:  string
}

// ── Meetings ──────────────────────────────────────────────────────

export async function fetchMeetings(buildingId: string): Promise<Meeting[]> {
  if (buildingId.startsWith('mock-')) return MOCK_MEETINGS[buildingId] ?? []
  return apiFetch<Meeting[]>(`/api/v1/meetings?building_id=${buildingId}`, '')
}

export interface MeetingBody {
  title:   string
  date:    string
  agenda?: string
}

export async function apiCreateMeeting(token: string, buildingId: string, body: MeetingBody): Promise<Meeting> {
  return apiFetch<Meeting>(`/api/v1/meetings?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiUpdateMeeting(token: string, buildingId: string, id: string, body: Partial<MeetingBody>): Promise<Meeting> {
  return apiFetch<Meeting>(`/api/v1/meetings/${id}?building_id=${buildingId}`, token, {
    method: 'PATCH', body: JSON.stringify(body),
  })
}

export async function apiDeleteMeeting(token: string, buildingId: string, id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/meetings/${id}?building_id=${buildingId}`, token, { method: 'DELETE' })
}

export async function apiStartMeeting(token: string, buildingId: string, id: string): Promise<{ meeting: Meeting; token: string | null; room_url: string }> {
  return apiFetch(`/api/v1/meetings/${id}/start?building_id=${buildingId}`, token, { method: 'POST' })
}

export async function apiEndMeeting(token: string, buildingId: string, id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/v1/meetings/${id}/end?building_id=${buildingId}`, token, { method: 'POST' })
}

// ── Votes ─────────────────────────────────────────────────────────

export async function fetchVotes(buildingId: string, meetingId: string): Promise<Vote[]> {
  if (buildingId.startsWith('mock-')) return MOCK_VOTES[meetingId] ?? []
  return apiFetch<Vote[]>(`/api/v1/meetings/${meetingId}/votes?building_id=${buildingId}`, '')
}

export interface VoteBody {
  question:     string
  description?: string
}

export async function apiCreateVote(token: string, buildingId: string, meetingId: string, body: VoteBody): Promise<Vote> {
  return apiFetch<Vote>(`/api/v1/meetings/${meetingId}/votes?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiCastVote(token: string, buildingId: string, meetingId: string, voteId: string, choice: 'yes' | 'no' | 'abstain'): Promise<VoteCast> {
  return apiFetch<VoteCast>(`/api/v1/meetings/${meetingId}/votes/${voteId}/cast?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify({ choice }),
  })
}

export async function apiCloseVote(token: string, buildingId: string, meetingId: string, voteId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/v1/meetings/${meetingId}/votes/${voteId}/close?building_id=${buildingId}`, token, { method: 'POST' })
}

// ── Mock data ─────────────────────────────────────────────────────

const MOCK_MEETINGS: Record<string, Meeting[]> = {
  'mock-building-1': [
    {
      id: 'mtg-1', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'Assemblée Générale Ordinaire 2026', date: '2026-09-15T18:00:00+02:00',
      agenda: '1. Approbation des comptes 2025\n2. Budget 2026\n3. Rénovation toiture\n4. Divers',
      status: 'scheduled', daily_room_name: null, daily_room_url: null,
      transcript: null, minutes: null, started_at: null, ended_at: null,
      created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z', deleted_at: null,
    },
    {
      id: 'mtg-2', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'Assemblée Générale Extraordinaire — Ascenseur', date: '2026-04-10T18:00:00+02:00',
      agenda: '1. Vote modernisation ascenseur\n2. Financement',
      status: 'completed', daily_room_name: null, daily_room_url: null,
      transcript: null,
      minutes: 'Réunion du 10 avril 2026\n\nPrésents: 18 copropriétaires sur 24\n\n1. Vote modernisation ascenseur\n   Résultat: 15 oui, 2 non, 1 abstention — Approuvé.\n\n2. Financement\n   Prélèvement sur le fonds de réserve approuvé.\n\nSéance levée à 19h45.',
      started_at: '2026-04-10T18:05:00Z', ended_at: '2026-04-10T19:45:00Z',
      created_at: '2026-03-20T00:00:00Z', updated_at: '2026-04-10T19:45:00Z', deleted_at: null,
    },
  ],
}

const MOCK_VOTES: Record<string, Vote[]> = {
  'mtg-2': [
    {
      id: 'vote-1', meeting_id: 'mtg-2', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      question: 'Approuver la modernisation de l\'ascenseur pour 45 000 €?',
      description: 'Remplacement de la cabine et du panneau de commande par Kone Belgium.',
      status: 'closed', vote_opened_at: '2026-04-10T18:15:00Z', vote_closed_at: '2026-04-10T18:35:00Z',
      created_at: '2026-04-10T18:15:00Z',
      vote_casts: [
        { id: 'vc-1', vote_id: 'vote-1', user_id: 'u1', unit_id: 'unit-1', choice: 'yes', vote_weight: 100, created_at: '2026-04-10T18:20:00Z' },
        { id: 'vc-2', vote_id: 'vote-1', user_id: 'u2', unit_id: 'unit-2', choice: 'yes', vote_weight: 80, created_at: '2026-04-10T18:22:00Z' },
        { id: 'vc-3', vote_id: 'vote-1', user_id: 'u3', unit_id: 'unit-3', choice: 'no',  vote_weight: 60, created_at: '2026-04-10T18:25:00Z' },
      ],
    },
  ],
}
