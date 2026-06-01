// ── Buildings client API ──────────────────────────────────────
// READ:  Supabase direct (RLS scopes to user's buildings)
// WRITE: Hono API (for audit logging)

import type { Building } from '@syndicsage/types'
import { supabase }       from '../../lib/supabase'
import { apiFetch }       from '../../lib/api'

// ── Reads (Supabase direct) ────────────────────────────────────

export async function fetchBuildings(): Promise<Building[]> {
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
  name:       string
  address:    string
  city:       string
  unit_count: number
}

export async function apiCreateBuilding(token: string, body: CreateBuildingBody): Promise<Building> {
  return apiFetch<Building>('/api/v1/buildings', token, {
    method: 'POST',
    body:   JSON.stringify(body),
  })
}

export interface UpdateBuildingBody {
  name?:       string
  address?:    string
  city?:       string
  unit_count?: number
  vme_number?: string | null
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
