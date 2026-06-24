// ── Expenses client API ───────────────────────────────────────

import { supabase }      from '../../lib/supabase'
import { apiFetch }      from '../../lib/api'

export interface Expense {
  id:              string
  building_id:     string
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

export async function fetchExpenses(buildingId: string, year: number): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('building_id', buildingId)
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)
    .is('deleted_at', null)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Expense[]
}

export interface CreateExpenseBody {
  date:            string
  description:     string
  amount:          number
  category:        string
  supplier?:       string | null
  reference?:      string | null
  accounting_code: string
  notes?:          string | null
}

export async function apiCreateExpense(
  token: string, buildingId: string, body: CreateExpenseBody,
): Promise<Expense> {
  return apiFetch<Expense>(`/api/v1/expenses?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiUpdateExpense(
  token: string, buildingId: string, expenseId: string, body: Partial<CreateExpenseBody>,
): Promise<Expense> {
  return apiFetch<Expense>(`/api/v1/expenses/${expenseId}?building_id=${buildingId}`, token, {
    method: 'PATCH', body: JSON.stringify(body),
  })
}

export async function apiDeleteExpense(
  token: string, buildingId: string, expenseId: string,
): Promise<void> {
  return apiFetch<void>(`/api/v1/expenses/${expenseId}?building_id=${buildingId}`, token, {
    method: 'DELETE',
  })
}
