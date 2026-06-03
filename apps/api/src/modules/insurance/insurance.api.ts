// ── Insurance repository layer ────────────────────────────────

import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { Errors }           from '../../shared/errors.js'

// ── Policies ─────────────────────────────────────────────────

export interface InsurancePolicyRow {
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

const VALID_POLICY_TYPES = ['fire','liability','omnium','elevator','legal','other'] as const
export type InsurancePolicyType = typeof VALID_POLICY_TYPES[number]
export function isValidPolicyType(v: string): v is InsurancePolicyType {
  return (VALID_POLICY_TYPES as readonly string[]).includes(v)
}

export async function listInsurancePolicies(buildingId: string): Promise<InsurancePolicyRow[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('insurance_policies')
    .select('*')
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw Errors.internal()
  return (data ?? []) as InsurancePolicyRow[]
}

export interface CreateInsurancePolicyInput {
  building_id:           string
  organization_id:       string
  insurer_name:          string
  type:                  InsurancePolicyType
  policy_number?:        string | null
  description?:          string | null
  premium_annual?:       number | null
  start_date?:           string | null
  end_date?:             string | null
  renewal_reminder_days?: number
  document_id?:          string | null
  contact_name?:         string | null
  contact_email?:        string | null
  contact_phone?:        string | null
  notes?:                string | null
}

export async function createInsurancePolicy(input: CreateInsurancePolicyInput): Promise<InsurancePolicyRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('insurance_policies')
    .insert(input)
    .select()
    .single()

  if (error || !data) throw Errors.internal()
  return data as InsurancePolicyRow
}

export interface UpdateInsurancePolicyInput {
  insurer_name?:         string
  type?:                 InsurancePolicyType
  policy_number?:        string | null
  description?:          string | null
  premium_annual?:       number | null
  start_date?:           string | null
  end_date?:             string | null
  renewal_reminder_days?: number
  document_id?:          string | null
  contact_name?:         string | null
  contact_email?:        string | null
  contact_phone?:        string | null
  notes?:                string | null
}

export async function updateInsurancePolicy(
  policyId:   string,
  buildingId: string,
  input:      UpdateInsurancePolicyInput,
): Promise<InsurancePolicyRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('insurance_policies')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', policyId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) throw Errors.notFound('InsurancePolicy')
  return data as InsurancePolicyRow
}

export async function softDeleteInsurancePolicy(policyId: string, buildingId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('insurance_policies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', policyId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)

  if (error) throw Errors.internal()
}

// ── Claims ────────────────────────────────────────────────────

export interface InsuranceClaimRow {
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

const VALID_CLAIM_STATUSES = ['open','submitted','in_review','settled','rejected'] as const
export type InsuranceClaimStatus = typeof VALID_CLAIM_STATUSES[number]
export function isValidClaimStatus(v: string): v is InsuranceClaimStatus {
  return (VALID_CLAIM_STATUSES as readonly string[]).includes(v)
}

export async function listInsuranceClaims(buildingId: string, policyId?: string): Promise<InsuranceClaimRow[]> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('insurance_claims')
    .select('*')
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .order('date', { ascending: false })

  if (policyId) query = query.eq('policy_id', policyId)

  const { data, error } = await query
  if (error) throw Errors.internal()
  return (data ?? []) as InsuranceClaimRow[]
}

export interface CreateInsuranceClaimInput {
  building_id:     string
  organization_id: string
  policy_id:       string
  date:            string
  description:     string
  amount_claimed?: number | null
  amount_received?: number | null
  reference?:      string | null
  notes?:          string | null
}

export async function createInsuranceClaim(input: CreateInsuranceClaimInput): Promise<InsuranceClaimRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('insurance_claims')
    .insert(input)
    .select()
    .single()

  if (error || !data) throw Errors.internal()
  return data as InsuranceClaimRow
}

export interface UpdateInsuranceClaimInput {
  date?:            string
  description?:     string
  amount_claimed?:  number | null
  amount_received?: number | null
  status?:          InsuranceClaimStatus
  reference?:       string | null
  notes?:           string | null
}

export async function updateInsuranceClaim(
  claimId:    string,
  buildingId: string,
  input:      UpdateInsuranceClaimInput,
): Promise<InsuranceClaimRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('insurance_claims')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', claimId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) throw Errors.notFound('InsuranceClaim')
  return data as InsuranceClaimRow
}

export async function softDeleteInsuranceClaim(claimId: string, buildingId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('insurance_claims')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', claimId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)

  if (error) throw Errors.internal()
}
