import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  fetchRoadmap, apiCreateRoadmapItem, apiUpdateRoadmapItem, apiDeleteRoadmapItem,
  type RoadmapItem, type RoadmapItemBody,
} from './roadmap.api'

const qk = (buildingId: string) => ['roadmap', buildingId]

export function useRoadmap(buildingId: string | null | undefined) {
  return useQuery({
    queryKey: qk(buildingId ?? ''),
    queryFn:  () => fetchRoadmap(buildingId!),
    enabled:  !!buildingId,
  })
}

export function useCreateRoadmapItem(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RoadmapItemBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreateRoadmapItem(session.access_token, buildingId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId) }),
  })
}

export function useUpdateRoadmapItem(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<RoadmapItemBody> }) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdateRoadmapItem(session.access_token, buildingId, id, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId) }),
  })
}

export function useDeleteRoadmapItem(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiDeleteRoadmapItem(session.access_token, buildingId, id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId) }),
  })
}

export type { RoadmapItem }
