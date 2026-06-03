// ── Expenses repository layer ─────────────────────────────────

import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { Errors }           from '../../shared/errors.js'

export interface ExpenseRow {
  id:              string
  building_id:     string
  organization_id: string
  date:            string
  description:     string
  amount:          number
  category:        string
  supplier:        string | null
  reference:       string | null
  accounting_code: string
  notes:           string | null
  created_at:      string
}

export interface CreateExpenseInput {
  building_id:     string
  organization_id: string
  date:            string
  description:     string
  amount:          number
  category:        string
  supplier?:       string | null
  reference?:      string | null
  accounting_code: string
  notes?:          string | null
}

export async function listExpenses(buildingId: string, year: number): Promise<ExpenseRow[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('building_id', buildingId)
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)
    .is('deleted_at', null)
    .order('date', { ascending: false })

  if (error) throw Errors.internal()
  return (data ?? []) as ExpenseRow[]
}

export async function createExpense(input: CreateExpenseInput): Promise<ExpenseRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('expenses')
    .insert(input)
    .select()
    .single()

  if (error || !data) throw Errors.internal()
  return data as ExpenseRow
}

export interface UpdateExpenseInput {
  date?:            string
  description?:     string
  amount?:          number
  category?:        string
  supplier?:        string | null
  reference?:       string | null
  accounting_code?: string
  notes?:           string | null
}

export async function updateExpense(
  expenseId:  string,
  buildingId: string,
  input:      UpdateExpenseInput,
): Promise<ExpenseRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('expenses')
    .update(input)
    .eq('id', expenseId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) throw Errors.notFound('Expense')
  return data as ExpenseRow
}

export async function softDeleteExpense(expenseId: string, buildingId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', expenseId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)

  if (error) throw Errors.internal()
}
