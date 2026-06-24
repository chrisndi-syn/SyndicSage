import { apiFetch }   from '../../lib/api'

export interface BilanSummary {
  year:                  number
  building_id:           string
  bank_vue:              number
  bank_epargne:          number
  total_receivables:     number
  total_actif:           number
  reserve_fund_balance:  number
  total_income:          number
  total_expenses:        number
  net_result:            number
  total_passif:          number
  expenses_by_code:      Record<string, number>
}

export async function fetchBilan(
  token: string, buildingId: string, year: number,
): Promise<BilanSummary> {
  return apiFetch<BilanSummary>(
    `/api/v1/bilan?building_id=${buildingId}&year=${year}`, token,
  )
}

export interface UpdateBankBody {
  bank_vue?:             number
  bank_epargne?:         number
  reserve_fund_balance?: number
  starting_balance?:     number | null
}

export async function apiUpdateBankBalances(
  token: string, buildingId: string, body: UpdateBankBody,
): Promise<void> {
  return apiFetch<void>(`/api/v1/bilan/bank?building_id=${buildingId}`, token, {
    method: 'PATCH', body: JSON.stringify(body),
  })
}
