// ── Budget Lines repository layer ────────────────────────────

import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { Errors }           from '../../shared/errors.js'

export interface BudgetLineRow {
  id:              string
  building_id:     string
  organization_id: string
  year:            number
  category:        string
  description:     string
  amount_budgeted: number
  created_at:      string
}

export interface BudgetLineWithActual extends BudgetLineRow {
  amount_actual:  number   // summed from expenses at query time
  variance:       number   // amount_budgeted - amount_actual
}

export async function listBudgetLines(buildingId: string, year: number): Promise<BudgetLineWithActual[]> {
  const supabase = getSupabaseAdmin()

  // Fetch budget lines and expenses in parallel
  const [linesResult, expensesResult] = await Promise.all([
    supabase
      .from('budget_lines')
      .select('*')
      .eq('building_id', buildingId)
      .eq('year', year)
      .order('category'),
    supabase
      .from('expenses')
      .select('category, amount')
      .eq('building_id', buildingId)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .is('deleted_at', null),
  ])

  if (linesResult.error) throw Errors.internal()

  // Sum actual by category
  const actualByCategory = new Map<string, number>()
  for (const exp of expensesResult.data ?? []) {
    actualByCategory.set(exp.category, (actualByCategory.get(exp.category) ?? 0) + Number(exp.amount))
  }

  return (linesResult.data ?? []).map((line) => {
    const actual = actualByCategory.get(line.category) ?? 0
    return {
      ...(line as BudgetLineRow),
      amount_actual: actual,
      variance:      Number(line.amount_budgeted) - actual,
    }
  })
}

export interface CreateBudgetLineInput {
  building_id:     string
  organization_id: string
  year:            number
  category:        string
  description:     string
  amount_budgeted: number
}

export async function createBudgetLine(input: CreateBudgetLineInput): Promise<BudgetLineRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('budget_lines')
    .insert(input)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw Errors.conflict(`Budget line for "${input.category}" already exists for ${input.year}`)
    throw Errors.internal()
  }
  return data as BudgetLineRow
}

export interface UpdateBudgetLineInput {
  category?:        string
  description?:     string
  amount_budgeted?: number
}

export async function updateBudgetLine(
  lineId:     string,
  buildingId: string,
  input:      UpdateBudgetLineInput,
): Promise<BudgetLineRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('budget_lines')
    .update(input)
    .eq('id', lineId)
    .eq('building_id', buildingId)
    .select()
    .single()

  if (error || !data) throw Errors.notFound('Budget line')
  return data as BudgetLineRow
}

export async function deleteBudgetLine(lineId: string, buildingId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('budget_lines')
    .delete()
    .eq('id', lineId)
    .eq('building_id', buildingId)

  if (error) throw Errors.internal()
}
