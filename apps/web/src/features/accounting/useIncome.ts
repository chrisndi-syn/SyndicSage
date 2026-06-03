import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  fetchIncome, apiCreateIncome, apiUpdateIncome, apiDeleteIncome,
  type CreateIncomeBody, type Income,
} from './income.api'

const qk = (buildingId: string, year: number) => ['income', buildingId, year]

export function useIncome(buildingId: string | null | undefined, year: number) {
  return useQuery({
    queryKey: qk(buildingId ?? '', year),
    queryFn:  () => fetchIncome(buildingId!, year),
    enabled:  !!buildingId,
  })
}

export function useCreateIncome(buildingId: string, year: number) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateIncomeBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreateIncome(session.access_token, buildingId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId, year) }),
  })
}

export function useUpdateIncome(buildingId: string, year: number) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateIncomeBody> }) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdateIncome(session.access_token, buildingId, id, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId, year) }),
  })
}

export function useDeleteIncome(buildingId: string, year: number) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (incomeId: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiDeleteIncome(session.access_token, buildingId, incomeId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId, year) }),
  })
}

export type { Income }
