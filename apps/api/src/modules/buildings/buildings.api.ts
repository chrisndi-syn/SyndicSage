// ── Buildings repository layer ────────────────────────────────
// All Supabase calls for the buildings module.
// Route handlers call these functions — never raw DB calls inline.

import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { Errors }           from '../../shared/errors.js'

export interface BuildingRow {
  id:              string
  organization_id: string
  name:            string
  address:         string
  city:            string
  unit_count:      number
  vme_number:      string | null
  created_at:      string
  updated_at:      string
}

// ── Helpers ────────────────────────────────────────────────────

export async function getOrgForUser(userId: string): Promise<{ id: string }> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .single()

  if (error || !data) throw Errors.notFound('Profile')
  return { id: (data as { organization_id: string }).organization_id }
}

export async function userIsSyndicInOrg(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('building_members')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'syndic')
    .limit(1)
  return (data?.length ?? 0) > 0
}

// ── CRUD ────────────────────────────────────────────────────────

export interface CreateBuildingInput {
  organization_id: string
  name:            string
  address:         string
  city:            string
  unit_count:      number
}

export async function createBuilding(
  input:  CreateBuildingInput,
  userId: string,
): Promise<BuildingRow> {
  const supabase = getSupabaseAdmin()

  const { data: building, error: bErr } = await supabase
    .from('buildings')
    .insert(input)
    .select()
    .single()

  if (bErr || !building) throw Errors.internal()

  // Make creator the syndic of this building
  const { error: mErr } = await supabase
    .from('building_members')
    .insert({ building_id: (building as BuildingRow).id, user_id: userId, role: 'syndic' })

  if (mErr) {
    // Rollback building — can't leave an orphan
    await supabase.from('buildings').delete().eq('id', (building as BuildingRow).id)
    throw Errors.internal()
  }

  return building as BuildingRow
}

export interface UpdateBuildingInput {
  name?:       string
  address?:    string
  city?:       string
  unit_count?: number
  vme_number?: string | null
}

export async function updateBuilding(
  buildingId: string,
  input:      UpdateBuildingInput,
): Promise<BuildingRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('buildings')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', buildingId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) throw Errors.notFound('Building')
  return data as BuildingRow
}

export async function softDeleteBuilding(buildingId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('buildings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', buildingId)
    .is('deleted_at', null)

  if (error) throw Errors.internal()
}

// ── Member offboarding ─────────────────────────────────────────

export interface MemberRow {
  id:         string
  user_id:    string
  role:       string
  building_id: string
}

export async function getMember(buildingId: string, memberId: string): Promise<MemberRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('building_members')
    .select('id, user_id, role, building_id')
    .eq('id', memberId)
    .eq('building_id', buildingId)
    .single()

  if (error || !data) throw Errors.notFound('Member')
  return data as MemberRow
}

export async function removeMemberFromBuilding(memberId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('building_members')
    .delete()
    .eq('id', memberId)

  if (error) throw Errors.internal()
}

export async function revokeUserSessions(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  try {
    // Sign the user out of all sessions
    await (supabase.auth.admin as unknown as {
      signOut: (uid: string, scope: string) => Promise<unknown>
    }).signOut(userId, 'global')
  } catch (err) {
    // Non-fatal — member is already removed from the building
    console.warn('[buildings] session revocation failed for', userId, err)
  }
}

// ── List members ───────────────────────────────────────────────

export async function getBuildingMembers(buildingId: string): Promise<{
  id: string; user_id: string; role: string; unit_id: string | null; joined_at: string | null
}[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('building_members')
    .select('id, user_id, role, unit_id, joined_at')
    .eq('building_id', buildingId)

  if (error) throw Errors.internal()
  return (data ?? []) as {
    id: string; user_id: string; role: string; unit_id: string | null; joined_at: string | null
  }[]
}
