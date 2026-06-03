// ── Income repository layer ───────────────────────────────────

import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { Errors }           from '../../shared/errors.js'

export interface IncomeRow {
  id:              string
  building_id:     string
  organization_id: string
  date:            string
  type:            string
  description:     string
  amount:          number
  owner_id:        string | null
  reference:       string | null
  notes:           string | null
  created_at:      string
}

export interface CreateIncomeInput {
  building_id:     string
  organization_id: string
  date:            string
  type:            string
  description:     string
  amount:          number
  owner_id?:       string | null
  reference?:      string | null
  notes?:          string | null
}

export async function listIncome(buildingId: string, year: number): Promise<IncomeRow[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('income')
    .select('*')
    .eq('building_id', buildingId)
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)
    .is('deleted_at', null)
    .order('date', { ascending: false })

  if (error) throw Errors.internal()
  return (data ?? []) as IncomeRow[]
}

export async function createIncome(input: CreateIncomeInput): Promise<IncomeRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('income')
    .insert(input)
    .select()
    .single()

  if (error || !data) throw Errors.internal()
  return data as IncomeRow
}

export interface UpdateIncomeInput {
  date?:        string
  type?:        string
  description?: string
  amount?:      number
  owner_id?:    string | null
  reference?:   string | null
  notes?:       string | null
}

export async function updateIncome(
  incomeId:   string,
  buildingId: string,
  input:      UpdateIncomeInput,
): Promise<IncomeRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('income')
    .update(input)
    .eq('id', incomeId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) throw Errors.notFound('Income')
  return data as IncomeRow
}

export async function softDeleteIncome(incomeId: string, buildingId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('income')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', incomeId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)

  if (error) throw Errors.internal()
}
