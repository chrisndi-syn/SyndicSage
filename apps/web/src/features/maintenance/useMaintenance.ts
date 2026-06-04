import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  fetchMaintenanceTasks, apiCreateTask, apiUpdateTask, apiMarkDone, apiDeleteTask,
  type MaintenanceTask, type TaskBody,
} from './maintenance.api'

const qk = (buildingId: string) => ['maintenance', buildingId]

export function useMaintenance(buildingId: string | null | undefined) {
  return useQuery({
    queryKey: qk(buildingId ?? ''),
    queryFn:  () => fetchMaintenanceTasks(buildingId!),
    enabled:  !!buildingId,
  })
}

export function useCreateTask(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: TaskBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreateTask(session.access_token, buildingId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId) }),
  })
}

export function useUpdateTask(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<TaskBody> }) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdateTask(session.access_token, buildingId, id, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId) }),
  })
}

export function useMarkDone(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      if (!session) {
        // Dev mode mock: just invalidate
        return Promise.resolve({ ok: true, next_due_date: '' })
      }
      return apiMarkDone(session.access_token, buildingId, id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId) }),
  })
}

export function useDeleteTask(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiDeleteTask(session.access_token, buildingId, id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId) }),
  })
}

export type { MaintenanceTask }
