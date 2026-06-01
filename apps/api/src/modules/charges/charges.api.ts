// ── Charges repository layer ──────────────────────────────────

import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { Errors }           from '../../shared/errors.js'

export interface ChargeRow {
  id:          string
  building_id: string
  owner_id:    string | null
  title:       string
  amount:      number
  status:      string
  period:      string
  due_date:    string
  paid_date:   string | null
  notes:       string | null
  created_at:  string
}

export interface CreateChargeInput {
  building_id: string
  owner_id?:   string
  title:       string
  amount:      number
  period:      string
  due_date:    string
  notes?:      string
}

export async function createCharge(input: CreateChargeInput): Promise<ChargeRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('charges')
    .insert({ ...input, status: 'pending' })
    .select()
    .single()

  if (error || !data) throw Errors.internal()
  return data as ChargeRow
}

export interface UpdateChargeInput {
  title?:    string
  amount?:   number
  period?:   string
  due_date?: string
  notes?:    string | null
}

export async function updateCharge(
  chargeId:   string,
  buildingId: string,
  input:      UpdateChargeInput,
): Promise<ChargeRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('charges')
    .update(input)
    .eq('id', chargeId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) throw Errors.notFound('Charge')
  return data as ChargeRow
}

export async function markChargePaid(chargeId: string, buildingId: string): Promise<ChargeRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('charges')
    .update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] })
    .eq('id', chargeId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) throw Errors.notFound('Charge')
  return data as ChargeRow
}

export async function softDeleteCharge(chargeId: string, buildingId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('charges')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', chargeId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)

  if (error) throw Errors.internal()
}

// Auto-mark overdue: called by a scheduled job later; available as utility now.
export async function markOverdueCharges(buildingId: string): Promise<number> {
  const supabase = getSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]!

  const { data, error } = await supabase
    .from('charges')
    .update({ status: 'overdue' })
    .eq('building_id', buildingId)
    .eq('status', 'pending')
    .lt('due_date', today)
    .is('deleted_at', null)
    .select('id')

  if (error) throw Errors.internal()
  return (data ?? []).length
}
