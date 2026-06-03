import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  fetchMeetings, fetchVotes,
  apiCreateMeeting, apiUpdateMeeting, apiDeleteMeeting,
  apiStartMeeting, apiEndMeeting,
  apiCreateVote, apiCastVote, apiCloseVote,
  type Meeting, type Vote, type MeetingBody, type VoteBody,
} from './meetings.api'

const meetingQk = (buildingId: string) => ['meetings', buildingId]
const voteQk    = (meetingId: string)  => ['votes', meetingId]

export function useMeetings(buildingId: string | null | undefined) {
  return useQuery({
    queryKey: meetingQk(buildingId ?? ''),
    queryFn:  () => fetchMeetings(buildingId!),
    enabled:  !!buildingId,
  })
}

export function useVotes(buildingId: string | null | undefined, meetingId: string | null | undefined) {
  return useQuery({
    queryKey: voteQk(meetingId ?? ''),
    queryFn:  () => fetchVotes(buildingId!, meetingId!),
    enabled:  !!buildingId && !!meetingId,
    refetchInterval: 5000, // live tally every 5s during meeting
  })
}

export function useCreateMeeting(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: MeetingBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreateMeeting(session.access_token, buildingId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: meetingQk(buildingId) }),
  })
}

export function useUpdateMeeting(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<MeetingBody> }) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdateMeeting(session.access_token, buildingId, id, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: meetingQk(buildingId) }),
  })
}

export function useDeleteMeeting(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiDeleteMeeting(session.access_token, buildingId, id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: meetingQk(buildingId) }),
  })
}

export function useStartMeeting(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiStartMeeting(session.access_token, buildingId, id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: meetingQk(buildingId) }),
  })
}

export function useEndMeeting(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiEndMeeting(session.access_token, buildingId, id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: meetingQk(buildingId) }),
  })
}

export function useCreateVote(buildingId: string, meetingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: VoteBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreateVote(session.access_token, buildingId, meetingId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: voteQk(meetingId) }),
  })
}

export function useCastVote(buildingId: string, meetingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ voteId, choice }: { voteId: string; choice: 'yes' | 'no' | 'abstain' }) => {
      if (!session) throw new Error('Not authenticated')
      return apiCastVote(session.access_token, buildingId, meetingId, voteId, choice)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: voteQk(meetingId) }),
  })
}

export function useCloseVote(buildingId: string, meetingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (voteId: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiCloseVote(session.access_token, buildingId, meetingId, voteId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: voteQk(meetingId) }),
  })
}

export type { Meeting, Vote }
