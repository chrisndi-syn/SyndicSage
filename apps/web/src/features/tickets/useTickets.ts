import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  fetchTickets, apiCreateTicket, apiUpdateTicket, apiCloseTicket,
  type CreateTicketBody, type UpdateTicketBody, type Ticket,
} from './tickets.api'

const qk = (buildingId: string) => ['tickets', buildingId]

export function useTickets(buildingId: string | null | undefined) {
  return useQuery({
    queryKey: qk(buildingId ?? ''),
    queryFn:  () => fetchTickets(buildingId!),
    enabled:  !!buildingId,
  })
}

export function useCreateTicket(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTicketBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreateTicket(session.access_token, buildingId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId) }),
  })
}

export function useUpdateTicket(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTicketBody }) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdateTicket(session.access_token, buildingId, id, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId) }),
  })
}

export function useCloseTicket(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiCloseTicket(session.access_token, buildingId, id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId) }),
  })
}

export type { Ticket }
