// ── Buildings TanStack Query hooks ────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  fetchBuildings,
  apiCreateBuilding, apiUpdateBuilding, apiDeleteBuilding,
  type CreateBuildingBody, type UpdateBuildingBody,
} from './buildings.api'

const QUERY_KEY = ['buildings']

export function useBuildings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn:  fetchBuildings,
  })
}

export function useCreateBuilding() {
  const { session }  = useAuth()
  const queryClient  = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateBuildingBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreateBuilding(session.access_token, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useUpdateBuilding() {
  const { session }  = useAuth()
  const queryClient  = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBuildingBody }) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdateBuilding(session.access_token, id, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useDeleteBuilding() {
  const { session }  = useAuth()
  const queryClient  = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiDeleteBuilding(session.access_token, id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
