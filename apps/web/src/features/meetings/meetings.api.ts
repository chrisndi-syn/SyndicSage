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

export type VoteMajorityType = 'simple_50' | 'two_thirds' | 'four_fifths'

export interface Vote {
  id:              string
  meeting_id:      string
  building_id:     string
  organization_id: string
  question:        string
  description:     string | null
  majority_type:   VoteMajorityType
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
  return apiFetch<Vote[]>(`/api/v1/meetings/${meetingId}/votes?building_id=${buildingId}`, '')
}

export interface VoteBody {
  question:      string
  description?:  string
  majority_type?: VoteMajorityType
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

