import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  fetchExpenses, apiCreateExpense, apiUpdateExpense, apiDeleteExpense,
  type CreateExpenseBody, type Expense,
} from './expenses.api'

const qk = (buildingId: string, year: number) => ['expenses', buildingId, year]

export function useExpenses(buildingId: string | null | undefined, year: number) {
  return useQuery({
    queryKey: qk(buildingId ?? '', year),
    queryFn:  () => fetchExpenses(buildingId!, year),
    enabled:  !!buildingId,
  })
}

export function useCreateExpense(buildingId: string, year: number) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateExpenseBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreateExpense(session.access_token, buildingId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId, year) }),
  })
}

export function useUpdateExpense(buildingId: string, year: number) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateExpenseBody> }) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdateExpense(session.access_token, buildingId, id, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId, year) }),
  })
}

export function useDeleteExpense(buildingId: string, year: number) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (expenseId: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiDeleteExpense(session.access_token, buildingId, expenseId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId, year) }),
  })
}

export type { Expense }
