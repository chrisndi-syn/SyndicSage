// ── Contractors client API ─────────────────────────────────────

import { supabase }        from '../../lib/supabase'
import { apiFetch }        from '../../lib/api'

export interface Contractor {
  id:              string
  organization_id: string
  name:            string
  trade:           string
  phone:           string | null
  email:           string | null
  vat_number:      string | null
  address:         string | null
  notes:           string | null
  rating:          number | null
  created_at:      string
}

export interface SupplierContract {
  id:                    string
  building_id:           string
  organization_id:       string
  contractor_id:         string
  title:                 string
  description:           string | null
  start_date:            string | null
  end_date:              string | null
  amount_annual:         number | null
  status:                string
  document_id:           string | null
  renewal_reminder_days: number
  notes:                 string | null
  created_at:            string
  updated_at:            string
}

export async function fetchContractors(organizationId: string): Promise<Contractor[]> {
  const { data, error } = await supabase
    .from('contractors')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as Contractor[]
}

export async function fetchSupplierContracts(buildingId: string): Promise<SupplierContract[]> {
  const { data, error } = await supabase
    .from('supplier_contracts')
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as SupplierContract[]
}

// ── Contractor CRUD ────────────────────────────────────────────

export interface CreateContractorBody {
  name:        string
  trade:       string
  phone?:      string | null
  email?:      string | null
  vat_number?: string | null
  address?:    string | null
  notes?:      string | null
  rating?:     number | null
}

export async function apiCreateContractor(
  token: string, organizationId: string, body: CreateContractorBody,
): Promise<Contractor> {
  return apiFetch<Contractor>(`/api/v1/contractors?organization_id=${organizationId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiUpdateContractor(
  token: string, organizationId: string, id: string, body: Partial<CreateContractorBody>,
): Promise<Contractor> {
  return apiFetch<Contractor>(`/api/v1/contractors/${id}?organization_id=${organizationId}`, token, {
    method: 'PATCH', body: JSON.stringify(body),
  })
}

export async function apiDeleteContractor(
  token: string, organizationId: string, id: string,
): Promise<void> {
  return apiFetch<void>(`/api/v1/contractors/${id}?organization_id=${organizationId}`, token, {
    method: 'DELETE',
  })
}

// ── Supplier contract CRUD ─────────────────────────────────────

export interface CreateSupplierContractBody {
  contractor_id:          string
  title:                  string
  description?:           string | null
  start_date?:            string | null
  end_date?:              string | null
  amount_annual?:         number | null
  status?:                string
  notes?:                 string | null
  renewal_reminder_days?: number
}

export async function apiCreateSupplierContract(
  token: string, buildingId: string, body: CreateSupplierContractBody,
): Promise<SupplierContract> {
  return apiFetch<SupplierContract>(`/api/v1/supplier-contracts?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiUpdateSupplierContract(
  token: string, buildingId: string, id: string, body: Partial<CreateSupplierContractBody>,
): Promise<SupplierContract> {
  return apiFetch<SupplierContract>(`/api/v1/supplier-contracts/${id}?building_id=${buildingId}`, token, {
    method: 'PATCH', body: JSON.stringify(body),
  })
}

export async function apiDeleteSupplierContract(
  token: string, buildingId: string, id: string,
): Promise<void> {
  return apiFetch<void>(`/api/v1/supplier-contracts/${id}?building_id=${buildingId}`, token, {
    method: 'DELETE',
  })
}
