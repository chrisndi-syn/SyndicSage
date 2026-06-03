import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  fetchContractors, fetchSupplierContracts,
  apiCreateContractor, apiUpdateContractor, apiDeleteContractor,
  apiCreateSupplierContract, apiUpdateSupplierContract, apiDeleteSupplierContract,
  type CreateContractorBody, type CreateSupplierContractBody,
  type Contractor, type SupplierContract,
} from './contractors.api'

const contractorQk = (organizationId: string) => ['contractors', organizationId]
const contractQk   = (buildingId: string)      => ['supplier_contracts', buildingId]

// ── Contractors ───────────────────────────────────────────────

export function useContractors(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: contractorQk(organizationId ?? ''),
    queryFn:  () => fetchContractors(organizationId!),
    enabled:  !!organizationId,
  })
}

export function useCreateContractor(organizationId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateContractorBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreateContractor(session.access_token, organizationId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: contractorQk(organizationId) }),
  })
}

export function useUpdateContractor(organizationId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateContractorBody> }) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdateContractor(session.access_token, organizationId, id, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: contractorQk(organizationId) }),
  })
}

export function useDeleteContractor(organizationId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiDeleteContractor(session.access_token, organizationId, id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: contractorQk(organizationId) }),
  })
}

// ── Supplier contracts ────────────────────────────────────────

export function useSupplierContracts(buildingId: string | null | undefined) {
  return useQuery({
    queryKey: contractQk(buildingId ?? ''),
    queryFn:  () => fetchSupplierContracts(buildingId!),
    enabled:  !!buildingId,
  })
}

export function useCreateSupplierContract(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateSupplierContractBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreateSupplierContract(session.access_token, buildingId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: contractQk(buildingId) }),
  })
}

export function useUpdateSupplierContract(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateSupplierContractBody> }) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdateSupplierContract(session.access_token, buildingId, id, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: contractQk(buildingId) }),
  })
}

export function useDeleteSupplierContract(buildingId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiDeleteSupplierContract(session.access_token, buildingId, id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: contractQk(buildingId) }),
  })
}

export type { Contractor, SupplierContract }
