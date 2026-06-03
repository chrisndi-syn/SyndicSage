import { apiFetch }   from '../../lib/api'
import { MOCK_BILAN } from '../../lib/mockData'

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
  if (buildingId.startsWith('mock-')) {
    return MOCK_BILAN[buildingId] ?? { year, building_id: buildingId, bank_vue: 0, bank_epargne: 0, total_receivables: 0, total_actif: 0, reserve_fund_balance: 0, total_income: 0, total_expenses: 0, net_result: 0, total_passif: 0, expenses_by_code: {} }
  }
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
