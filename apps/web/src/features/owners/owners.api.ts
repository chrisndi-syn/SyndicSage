// ── Owners client API ─────────────────────────────────────────

import { supabase }    from '../../lib/supabase'
import { apiFetch }    from '../../lib/api'
import { MOCK_OWNERS } from '../../lib/mockData'

export interface OwnerWithUnit {
  id:                 string
  building_id:        string
  unit_id:            string
  full_name:          string
  email:              string
  phone:              string | null
  is_renter:          boolean
  bank_account:       string | null
  preferred_language: 'en' | 'fr' | 'nl'
  mailing_address:    string | null
  has_no_email:       boolean
  created_at:         string
  units: {
    id:              string
    unit_number:     string
    unit_type:       string
    ownership_share: number
  }
}

// ── Reads (Supabase direct) ────────────────────────────────────

export async function fetchOwners(buildingId: string): Promise<OwnerWithUnit[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return MOCK_OWNERS[buildingId] ?? []

  const { data, error } = await supabase
    .from('owners')
    .select(`
      id, building_id, unit_id, full_name, email, phone, is_renter,
      bank_account, preferred_language, mailing_address, has_no_email,
      created_at,
      units (id, unit_number, unit_type, ownership_share)
    `)
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .order('full_name')

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as OwnerWithUnit[]
}

// ── Writes (Hono API) ─────────────────────────────────────────

export interface CreateOwnerBody {
  unit_number:        string
  unit_type:          string
  ownership_share:    number
  full_name:          string
  email:              string
  phone?:             string
  is_renter:          boolean
  has_no_email?:      boolean
  bank_account?:      string
  preferred_language?: 'en' | 'fr' | 'nl'
  mailing_address?:   string
}

export async function apiCreateOwner(
  token:      string,
  buildingId: string,
  body:       CreateOwnerBody,
): Promise<OwnerWithUnit> {
  return apiFetch<OwnerWithUnit>(
    `/api/v1/owners?building_id=${buildingId}`,
    token,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export interface UpdateOwnerBody {
  full_name?:          string
  email?:              string
  phone?:              string | null
  is_renter?:          boolean
  bank_account?:       string | null
  preferred_language?: 'en' | 'fr' | 'nl'
  mailing_address?:    string | null
  has_no_email?:       boolean
}

export async function apiUpdateOwner(
  token:      string,
  buildingId: string,
  ownerId:    string,
  body:       UpdateOwnerBody,
): Promise<OwnerWithUnit> {
  return apiFetch<OwnerWithUnit>(
    `/api/v1/owners/${ownerId}?building_id=${buildingId}`,
    token,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
}

export async function apiDeleteOwner(
  token:      string,
  buildingId: string,
  ownerId:    string,
): Promise<void> {
  return apiFetch<void>(
    `/api/v1/owners/${ownerId}?building_id=${buildingId}`,
    token,
    { method: 'DELETE' },
  )
}
