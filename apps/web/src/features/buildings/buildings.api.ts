// ── Buildings client API ──────────────────────────────────────
// READ:  Supabase direct (RLS scopes to user's buildings)
// WRITE: Hono API (for audit logging)

import type { Building } from '@syndicsage/types'
import { supabase }       from '../../lib/supabase'
import { apiFetch }       from '../../lib/api'
import { MOCK_BUILDINGS }  from '../../lib/mockData'

// ── Reads (Supabase direct) ────────────────────────────────────

export async function fetchBuildings(): Promise<Building[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return MOCK_BUILDINGS

  const { data, error } = await supabase
    .from('buildings')
    .select('*')
    .is('deleted_at', null)
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []) as Building[]
}

// ── Writes (Hono API) ─────────────────────────────────────────

export interface CreateBuildingBody {
  name:                  string
  address:               string
  city:                  string
  unit_count:            number
  vme_number?:           string
  building_type?:        string
  year_built?:           number
  floors?:               number
  ag_date?:              string
  mandate_start?:        string
  mandate_expiry?:       string
  annual_budget?:        number
  reserve_fund_balance?: number
  bank_iban?:            string
  bank_name?:            string
  auto_remind_enabled?:  boolean
  auto_remind_days?:     number
}

export async function apiCreateBuilding(token: string, body: CreateBuildingBody): Promise<Building> {
  return apiFetch<Building>('/api/v1/buildings', token, {
    method: 'POST',
    body:   JSON.stringify(body),
  })
}

export interface UpdateBuildingBody {
  name?:                 string
  address?:              string
  city?:                 string
  unit_count?:           number
  vme_number?:           string | null
  building_type?:        string | null
  year_built?:           number | null
  floors?:               number | null
  ag_date?:              string | null
  mandate_start?:        string | null
  mandate_expiry?:       string | null
  annual_budget?:        number | null
  reserve_fund_balance?: number | null
  bank_iban?:            string | null
  bank_name?:            string | null
  auto_remind_enabled?:  boolean
  auto_remind_days?:     number
}

export async function apiUpdateBuilding(
  token:      string,
  buildingId: string,
  body:       UpdateBuildingBody,
): Promise<Building> {
  return apiFetch<Building>(`/api/v1/buildings/${buildingId}?building_id=${buildingId}`, token, {
    method: 'PATCH',
    body:   JSON.stringify(body),
  })
}

export async function apiDeleteBuilding(token: string, buildingId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/buildings/${buildingId}?building_id=${buildingId}`, token, {
    method: 'DELETE',
  })
}
