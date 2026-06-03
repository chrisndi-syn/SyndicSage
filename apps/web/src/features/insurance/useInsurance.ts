import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  fetchInsurancePolicies, fetchInsuranceClaims,
  apiCreatePolicy, apiUpdatePolicy, apiDeletePolicy,
  apiCreateClaim, apiUpdateClaim, apiDeleteClaim,
  type CreatePolicyBody, type CreateClaimBody,
  type InsurancePolicy, type InsuranceClaim,
} from './insurance.api'

const policyQk = (buildingId: string) => ['insurance_policies', buildingId]
const claimQk  = (buildingId: string, policyId?: string) => ['insurance_claims', buildingId, policyId ?? 'all']

// ── Policies ──────────────────────────────────────────────────

export function useInsurancePolicies(buildingId: string | null | undefined) {
  return useQuery({
    queryKey: policyQk(buildingId ?? ''),
    queryFn:  () => fetchInsurancePolicies(buildingId!),
    enabled:  !!buildingId,
  })
}

export function useCreateInsurancePolicy(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePolicyBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreatePolicy(session.access_token, buildingId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: policyQk(buildingId) }),
  })
}

export function useUpdateInsurancePolicy(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreatePolicyBody> }) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdatePolicy(session.access_token, buildingId, id, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: policyQk(buildingId) }),
  })
}

export function useDeleteInsurancePolicy(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiDeletePolicy(session.access_token, buildingId, id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: policyQk(buildingId) }),
  })
}

// ── Claims ────────────────────────────────────────────────────

export function useInsuranceClaims(buildingId: string | null | undefined, policyId?: string) {
  return useQuery({
    queryKey: claimQk(buildingId ?? '', policyId),
    queryFn:  () => fetchInsuranceClaims(buildingId!, policyId),
    enabled:  !!buildingId,
  })
}

export function useCreateInsuranceClaim(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateClaimBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreateClaim(session.access_token, buildingId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: claimQk(buildingId) }),
  })
}

export function useUpdateInsuranceClaim(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateClaimBody> }) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdateClaim(session.access_token, buildingId, id, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: claimQk(buildingId) }),
  })
}

export function useDeleteInsuranceClaim(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiDeleteClaim(session.access_token, buildingId, id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: claimQk(buildingId) }),
  })
}

export type { InsurancePolicy, InsuranceClaim }
