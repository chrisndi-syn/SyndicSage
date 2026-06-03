// ── Contractors repository layer ──────────────────────────────
// Contractors are org-level (no building_id).

import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { Errors }           from '../../shared/errors.js'

export interface ContractorRow {
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

const VALID_TRADES = [
  'plumber','electrician','elevator','cleaning','landscaping',
  'painting','hvac','locksmith','general','other',
] as const
export type ContractorTrade = typeof VALID_TRADES[number]
export function isValidTrade(v: string): v is ContractorTrade {
  return (VALID_TRADES as readonly string[]).includes(v)
}

export async function listContractors(organizationId: string): Promise<ContractorRow[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('contractors')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error) throw Errors.internal()
  return (data ?? []) as ContractorRow[]
}

export interface CreateContractorInput {
  organization_id: string
  name:            string
  trade:           ContractorTrade
  phone?:          string | null
  email?:          string | null
  vat_number?:     string | null
  address?:        string | null
  notes?:          string | null
  rating?:         number | null
}

export async function createContractor(input: CreateContractorInput): Promise<ContractorRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('contractors')
    .insert(input)
    .select()
    .single()

  if (error || !data) throw Errors.internal()
  return data as ContractorRow
}

export interface UpdateContractorInput {
  name?:       string
  trade?:      ContractorTrade
  phone?:      string | null
  email?:      string | null
  vat_number?: string | null
  address?:    string | null
  notes?:      string | null
  rating?:     number | null
}

export async function updateContractor(
  contractorId:   string,
  organizationId: string,
  input:          UpdateContractorInput,
): Promise<ContractorRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('contractors')
    .update(input)
    .eq('id', contractorId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) throw Errors.notFound('Contractor')
  return data as ContractorRow
}

export async function softDeleteContractor(contractorId: string, organizationId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('contractors')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', contractorId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  if (error) throw Errors.internal()
}
