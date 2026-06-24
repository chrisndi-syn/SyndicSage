// ── Charges client API ────────────────────────────────────────

import { supabase }     from '../../lib/supabase'
import { apiFetch }     from '../../lib/api'

export interface ChargeWithOwner {
  id:          string
  building_id: string
  owner_id:    string | null
  title:       string
  amount:      number
  status:      'pending' | 'paid' | 'overdue'
  period:      string
  due_date:    string
  paid_date:   string | null
  notes:       string | null
  created_at:  string
  owners: { full_name: string; units: { unit_number: string } } | null
}

export type StatusFilter = 'all' | 'pending' | 'paid' | 'overdue'

// ── Reads (Supabase direct) ────────────────────────────────────

export async function fetchCharges(
  buildingId:    string,
  statusFilter?: StatusFilter,
): Promise<ChargeWithOwner[]> {
  let query = supabase
    .from('charges')
    .select(`
      id, building_id, owner_id, title, amount, status, period,
      due_date, paid_date, notes, created_at,
      owners (full_name, units (unit_number))
    `)
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .order('due_date', { ascending: false })

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ChargeWithOwner[]
}

// ── Writes (Hono API) ─────────────────────────────────────────

export interface CreateChargeBody {
  owner_id?: string
  title:     string
  amount:    number
  period:    string
  due_date:  string
  notes?:    string
}

export async function apiCreateCharge(
  token:      string,
  buildingId: string,
  body:       CreateChargeBody,
): Promise<ChargeWithOwner> {
  return apiFetch<ChargeWithOwner>(
    `/api/v1/charges?building_id=${buildingId}`,
    token,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export interface UpdateChargeBody {
  title?:    string
  amount?:   number
  period?:   string
  due_date?: string
  notes?:    string | null
}

export async function apiUpdateCharge(
  token:      string,
  buildingId: string,
  chargeId:   string,
  body:       UpdateChargeBody,
): Promise<ChargeWithOwner> {
  return apiFetch<ChargeWithOwner>(
    `/api/v1/charges/${chargeId}?building_id=${buildingId}`,
    token,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
}

export async function apiMarkPaid(
  token:      string,
  buildingId: string,
  chargeId:   string,
): Promise<ChargeWithOwner> {
  return apiFetch<ChargeWithOwner>(
    `/api/v1/charges/${chargeId}/mark-paid?building_id=${buildingId}`,
    token,
    { method: 'PATCH', body: '{}' },
  )
}

export async function apiDeleteCharge(
  token:      string,
  buildingId: string,
  chargeId:   string,
): Promise<void> {
  return apiFetch<void>(
    `/api/v1/charges/${chargeId}?building_id=${buildingId}`,
    token,
    { method: 'DELETE' },
  )
}
