// ── Insurance client API ───────────────────────────────────────

import { supabase }               from '../../lib/supabase'
import { apiFetch }               from '../../lib/api'

export interface InsurancePolicy {
  id:                    string
  building_id:           string
  organization_id:       string
  insurer_name:          string
  policy_number:         string | null
  type:                  string
  description:           string | null
  premium_annual:        number | null
  start_date:            string | null
  end_date:              string | null
  renewal_reminder_days: number
  document_id:           string | null
  contact_name:          string | null
  contact_email:         string | null
  contact_phone:         string | null
  notes:                 string | null
  created_at:            string
  updated_at:            string
}

export interface InsuranceClaim {
  id:              string
  building_id:     string
  organization_id: string
  policy_id:       string
  date:            string
  description:     string
  amount_claimed:  number | null
  amount_received: number | null
  status:          string
  reference:       string | null
  notes:           string | null
  created_at:      string
  updated_at:      string
}

export async function fetchInsurancePolicies(buildingId: string): Promise<InsurancePolicy[]> {
  const { data, error } = await supabase
    .from('insurance_policies')
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as InsurancePolicy[]
}

export async function fetchInsuranceClaims(buildingId: string, policyId?: string): Promise<InsuranceClaim[]> {
  let query = supabase
    .from('insurance_claims')
    .select('*')
    .eq('building_id', buildingId)

  if (policyId) query = query.eq('policy_id', policyId)

  const { data, error } = await query.order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as InsuranceClaim[]
}

// ── Policy CRUD ────────────────────────────────────────────────

export interface CreatePolicyBody {
  insurer_name:           string
  type:                   string
  policy_number?:         string | null
  description?:           string | null
  premium_annual?:        number | null
  start_date?:            string | null
  end_date?:              string | null
  renewal_reminder_days?: number
  contact_name?:          string | null
  contact_email?:         string | null
  contact_phone?:         string | null
  notes?:                 string | null
}

export async function apiCreatePolicy(
  token: string, buildingId: string, body: CreatePolicyBody,
): Promise<InsurancePolicy> {
  return apiFetch<InsurancePolicy>(`/api/v1/insurance/policies?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiUpdatePolicy(
  token: string, buildingId: string, id: string, body: Partial<CreatePolicyBody>,
): Promise<InsurancePolicy> {
  return apiFetch<InsurancePolicy>(`/api/v1/insurance/policies/${id}?building_id=${buildingId}`, token, {
    method: 'PATCH', body: JSON.stringify(body),
  })
}

export async function apiDeletePolicy(
  token: string, buildingId: string, id: string,
): Promise<void> {
  return apiFetch<void>(`/api/v1/insurance/policies/${id}?building_id=${buildingId}`, token, {
    method: 'DELETE',
  })
}

// ── Claim CRUD ─────────────────────────────────────────────────

export interface CreateClaimBody {
  policy_id:        string
  date:             string
  description:      string
  amount_claimed?:  number | null
  amount_received?: number | null
  status?:          string
  reference?:       string | null
  notes?:           string | null
}

export async function apiCreateClaim(
  token: string, buildingId: string, body: CreateClaimBody,
): Promise<InsuranceClaim> {
  return apiFetch<InsuranceClaim>(`/api/v1/insurance/claims?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiUpdateClaim(
  token: string, buildingId: string, id: string, body: Partial<CreateClaimBody>,
): Promise<InsuranceClaim> {
  return apiFetch<InsuranceClaim>(`/api/v1/insurance/claims/${id}?building_id=${buildingId}`, token, {
    method: 'PATCH', body: JSON.stringify(body),
  })
}

export async function apiDeleteClaim(
  token: string, buildingId: string, id: string,
): Promise<void> {
  return apiFetch<void>(`/api/v1/insurance/claims/${id}?building_id=${buildingId}`, token, {
    method: 'DELETE',
  })
}
