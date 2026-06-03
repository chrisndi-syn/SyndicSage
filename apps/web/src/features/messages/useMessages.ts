import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import { fetchMessages, apiSendMessage, apiMarkRead, type Message } from './messages.api'

const qk = (buildingId: string) => ['messages', buildingId]

export function useMessages(buildingId: string | null | undefined) {
  return useQuery({
    queryKey: qk(buildingId ?? ''),
    queryFn:  () => fetchMessages(buildingId!),
    enabled:  !!buildingId,
    refetchInterval: 15000, // poll every 15s for new messages
  })
}

export function useSendMessage(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { body: string; subject?: string; thread_id?: string }) => {
      if (!session) throw new Error('Not authenticated')
      return apiSendMessage(session.access_token, buildingId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId) }),
  })
}

export function useMarkRead(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiMarkRead(session.access_token, buildingId, id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId) }),
  })
}

export type { Message }
