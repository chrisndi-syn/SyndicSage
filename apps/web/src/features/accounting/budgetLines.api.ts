import { apiFetch }           from '../../lib/api'

export interface BudgetLineWithActual {
  id:              string
  building_id:     string
  year:            number
  category:        string
  description:     string
  amount_budgeted: number
  amount_actual:   number
  variance:        number
  created_at:      string
}

export async function fetchBudgetLines(
  token: string, buildingId: string, year: number,
): Promise<BudgetLineWithActual[]> {
  return apiFetch<BudgetLineWithActual[]>(
    `/api/v1/budget-lines?building_id=${buildingId}&year=${year}`, token,
  )
}

export interface CreateBudgetLineBody {
  year:            number
  category:        string
  description:     string
  amount_budgeted: number
}

export async function apiCreateBudgetLine(
  token: string, buildingId: string, body: CreateBudgetLineBody,
): Promise<BudgetLineWithActual> {
  return apiFetch<BudgetLineWithActual>(`/api/v1/budget-lines?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiUpdateBudgetLine(
  token: string, buildingId: string, lineId: string,
  body: Partial<Pick<CreateBudgetLineBody, 'category' | 'description' | 'amount_budgeted'>>,
): Promise<BudgetLineWithActual> {
  return apiFetch<BudgetLineWithActual>(
    `/api/v1/budget-lines/${lineId}?building_id=${buildingId}`, token,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
}

export async function apiDeleteBudgetLine(
  token: string, buildingId: string, lineId: string,
): Promise<void> {
  return apiFetch<void>(`/api/v1/budget-lines/${lineId}?building_id=${buildingId}`, token, {
    method: 'DELETE',
  })
}
