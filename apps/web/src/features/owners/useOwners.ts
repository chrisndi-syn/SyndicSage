// ── Owners TanStack Query hooks ───────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  fetchOwners,
  apiCreateOwner, apiUpdateOwner, apiDeleteOwner,
  type CreateOwnerBody, type UpdateOwnerBody,
} from './owners.api'

const queryKey = (buildingId: string) => ['owners', buildingId]

export function useOwners(buildingId: string | null | undefined) {
  return useQuery({
    queryKey: queryKey(buildingId ?? ''),
    queryFn:  () => fetchOwners(buildingId!),
    enabled:  !!buildingId,
  })
}

export function useCreateOwner(buildingId: string) {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateOwnerBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreateOwner(session.access_token, buildingId, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey(buildingId) })
    },
  })
}

export function useUpdateOwner(buildingId: string) {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateOwnerBody }) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdateOwner(session.access_token, buildingId, id, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey(buildingId) })
    },
  })
}

export function useDeleteOwner(buildingId: string) {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ownerId: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiDeleteOwner(session.access_token, buildingId, ownerId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey(buildingId) })
    },
  })
}
