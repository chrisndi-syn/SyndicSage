import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  fetchBudgetLines, apiCreateBudgetLine, apiUpdateBudgetLine, apiDeleteBudgetLine,
  type CreateBudgetLineBody, type BudgetLineWithActual,
} from './budgetLines.api'

const qk = (buildingId: string, year: number) => ['budget-lines', buildingId, year]

export function useBudgetLines(buildingId: string | null | undefined, year: number) {
  const { session } = useAuth()
  const isMock = buildingId?.startsWith('mock-') ?? false
  return useQuery({
    queryKey: qk(buildingId ?? '', year),
    queryFn:  () => fetchBudgetLines(session?.access_token ?? '', buildingId!, year),
    enabled:  !!buildingId && (!!session || isMock),
  })
}

export function useCreateBudgetLine(buildingId: string, year: number) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateBudgetLineBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreateBudgetLine(session.access_token, buildingId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId, year) }),
  })
}

export function useUpdateBudgetLine(buildingId: string, year: number) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateBudgetLineBody> }) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdateBudgetLine(session.access_token, buildingId, id, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId, year) }),
  })
}

export function useDeleteBudgetLine(buildingId: string, year: number) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (lineId: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiDeleteBudgetLine(session.access_token, buildingId, lineId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId, year) }),
  })
}

export type { BudgetLineWithActual }
