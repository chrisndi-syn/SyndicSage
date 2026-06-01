// ── Owners repository layer ───────────────────────────────────

import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { Errors }           from '../../shared/errors.js'

export interface UnitRow {
  id:              string
  building_id:     string
  unit_number:     string
  unit_type:       string
  ownership_share: number
}

export interface OwnerRow {
  id:          string
  building_id: string
  unit_id:     string
  member_id:   string | null
  full_name:   string
  email:       string
  phone:       string | null
  is_renter:   boolean
  created_at:  string
}

export interface CreateOwnerInput {
  building_id:        string
  unit_number:        string
  unit_type:          string
  ownership_share:    number
  full_name:          string
  email?:             string
  phone?:             string
  is_renter:          boolean
  bank_account?:      string | null
  preferred_language?: string
  mailing_address?:   string | null
  has_no_email?:      boolean
}

// Creates unit + owner in one logical operation.
// Returns the new owner row.
export async function createOwnerWithUnit(input: CreateOwnerInput): Promise<OwnerRow> {
  const supabase = getSupabaseAdmin()

  // 1. Create the unit
  const { data: unit, error: unitErr } = await supabase
    .from('units')
    .insert({
      building_id:     input.building_id,
      unit_number:     input.unit_number,
      unit_type:       input.unit_type,
      ownership_share: input.ownership_share,
    })
    .select()
    .single()

  if (unitErr) {
    if (unitErr.code === '23505') {
      throw Errors.conflict(`Unit ${input.unit_number} already exists in this building`)
    }
    throw Errors.internal()
  }

  // 2. Create the owner linked to the unit
  const { data: owner, error: ownerErr } = await supabase
    .from('owners')
    .insert({
      building_id:        input.building_id,
      unit_id:            (unit as UnitRow).id,
      full_name:          input.full_name,
      email:              input.email,
      phone:              input.phone ?? null,
      is_renter:          input.is_renter,
      bank_account:       input.bank_account ?? null,
      preferred_language: input.preferred_language ?? 'fr',
      mailing_address:    input.mailing_address ?? null,
      has_no_email:       input.has_no_email ?? false,
    })
    .select()
    .single()

  if (ownerErr || !owner) {
    // Rollback: delete the unit
    await supabase.from('units').delete().eq('id', (unit as UnitRow).id)
    throw Errors.internal()
  }

  return owner as OwnerRow
}

export interface UpdateOwnerInput {
  full_name?:          string
  email?:              string
  phone?:              string | null
  is_renter?:          boolean
  bank_account?:       string | null
  preferred_language?: string
  mailing_address?:    string | null
  has_no_email?:       boolean
}

export async function updateOwner(
  ownerId:    string,
  buildingId: string,
  input:      UpdateOwnerInput,
): Promise<OwnerRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('owners')
    .update(input)
    .eq('id', ownerId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) throw Errors.notFound('Owner')
  return data as OwnerRow
}

export async function softDeleteOwner(ownerId: string, buildingId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('owners')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', ownerId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)

  if (error) throw Errors.internal()
}
