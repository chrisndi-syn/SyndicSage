import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  fetchInvitations, apiSendInvitation, apiRevokeInvitation,
  type Invitation,
} from './invitations.api'

const qk = (buildingId: string) => ['invitations', buildingId]

export function useInvitations(buildingId: string | null | undefined) {
  return useQuery({
    queryKey: qk(buildingId ?? ''),
    queryFn:  () => fetchInvitations(buildingId!),
    enabled:  !!buildingId,
  })
}

export function useSendInvitation(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { email: string; role: string; unit_id?: string }) => {
      if (!session) throw new Error('Not authenticated')
      return apiSendInvitation(session.access_token, buildingId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId) }),
  })
}

export function useRevokeInvitation(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiRevokeInvitation(session.access_token, buildingId, id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId) }),
  })
}

export type { Invitation }
