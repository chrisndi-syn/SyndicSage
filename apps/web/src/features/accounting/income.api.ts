import { supabase }    from '../../lib/supabase'
import { apiFetch }    from '../../lib/api'

export interface Income {
  id:          string
  building_id: string
  date:        string
  type:        string
  description: string
  amount:      number
  owner_id:    string | null
  reference:   string | null
  notes:       string | null
  created_at:  string
}

export async function fetchIncome(buildingId: string, year: number): Promise<Income[]> {
  const { data, error } = await supabase
    .from('income')
    .select('*')
    .eq('building_id', buildingId)
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)
    .is('deleted_at', null)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Income[]
}

export interface CreateIncomeBody {
  date:       string
  type:       string
  description:string
  amount:     number
  owner_id?:  string | null
  reference?: string | null
  notes?:     string | null
}

export async function apiCreateIncome(
  token: string, buildingId: string, body: CreateIncomeBody,
): Promise<Income> {
  return apiFetch<Income>(`/api/v1/income?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiUpdateIncome(
  token: string, buildingId: string, incomeId: string, body: Partial<CreateIncomeBody>,
): Promise<Income> {
  return apiFetch<Income>(`/api/v1/income/${incomeId}?building_id=${buildingId}`, token, {
    method: 'PATCH', body: JSON.stringify(body),
  })
}

export async function apiDeleteIncome(
  token: string, buildingId: string, incomeId: string,
): Promise<void> {
  return apiFetch<void>(`/api/v1/income/${incomeId}?building_id=${buildingId}`, token, {
    method: 'DELETE',
  })
}
