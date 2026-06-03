// ── Supplier Contracts repository layer ───────────────────────

import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { Errors }           from '../../shared/errors.js'

export interface SupplierContractRow {
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

const VALID_STATUSES = ['active','expired','cancelled','pending'] as const
export type SupplierContractStatus = typeof VALID_STATUSES[number]
export function isValidContractStatus(v: string): v is SupplierContractStatus {
  return (VALID_STATUSES as readonly string[]).includes(v)
}

export async function listSupplierContracts(buildingId: string): Promise<SupplierContractRow[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('supplier_contracts')
    .select('*')
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw Errors.internal()
  return (data ?? []) as SupplierContractRow[]
}

export interface CreateSupplierContractInput {
  building_id:           string
  organization_id:       string
  contractor_id:         string
  title:                 string
  description?:          string | null
  start_date?:           string | null
  end_date?:             string | null
  amount_annual?:        number | null
  document_id?:          string | null
  renewal_reminder_days?: number
  notes?:                string | null
}

export async function createSupplierContract(input: CreateSupplierContractInput): Promise<SupplierContractRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('supplier_contracts')
    .insert(input)
    .select()
    .single()

  if (error || !data) throw Errors.internal()
  return data as SupplierContractRow
}

export interface UpdateSupplierContractInput {
  title?:                string
  description?:          string | null
  contractor_id?:        string
  start_date?:           string | null
  end_date?:             string | null
  amount_annual?:        number | null
  status?:               SupplierContractStatus
  document_id?:          string | null
  renewal_reminder_days?: number
  notes?:                string | null
}

export async function updateSupplierContract(
  contractId: string,
  buildingId: string,
  input:      UpdateSupplierContractInput,
): Promise<SupplierContractRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('supplier_contracts')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', contractId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) throw Errors.notFound('SupplierContract')
  return data as SupplierContractRow
}

export async function softDeleteSupplierContract(contractId: string, buildingId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('supplier_contracts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', contractId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)

  if (error) throw Errors.internal()
}
