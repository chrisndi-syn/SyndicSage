// ── Charges TanStack Query hooks ──────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  fetchCharges, apiCreateCharge, apiUpdateCharge,
  apiMarkPaid, apiDeleteCharge,
  type CreateChargeBody, type UpdateChargeBody, type StatusFilter,
} from './charges.api'

const queryKey = (buildingId: string, filter: StatusFilter) => ['charges', buildingId, filter]

export function useCharges(buildingId: string | null | undefined, filter: StatusFilter = 'all') {
  return useQuery({
    queryKey: queryKey(buildingId ?? '', filter),
    queryFn:  () => fetchCharges(buildingId!, filter),
    enabled:  !!buildingId,
  })
}

export function useCreateCharge(buildingId: string) {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateChargeBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreateCharge(session.access_token, buildingId, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges', buildingId] })
    },
  })
}

export function useUpdateCharge(buildingId: string) {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateChargeBody }) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdateCharge(session.access_token, buildingId, id, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges', buildingId] })
    },
  })
}

export function useMarkPaid(buildingId: string) {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chargeId: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiMarkPaid(session.access_token, buildingId, chargeId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges', buildingId] })
    },
  })
}

export function useDeleteCharge(buildingId: string) {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chargeId: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiDeleteCharge(session.access_token, buildingId, chargeId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges', buildingId] })
    },
  })
}
