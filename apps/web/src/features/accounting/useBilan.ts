import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import { fetchBilan, apiUpdateBankBalances, type UpdateBankBody } from './bilan.api'

const qk = (buildingId: string, year: number) => ['bilan', buildingId, year]

export function useBilan(buildingId: string | null | undefined, year: number) {
  const { session } = useAuth()
  return useQuery({
    queryKey: qk(buildingId ?? '', year),
    queryFn:  () => fetchBilan(session?.access_token ?? '', buildingId!, year),
    enabled:  !!buildingId && !!session,
  })
}

export function useUpdateBankBalances(buildingId: string, year: number) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateBankBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdateBankBalances(session.access_token, buildingId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(buildingId, year) }),
  })
}
