// ── Owners repository layer ───────────────────────────────────

import { getSupabaseAdmin }           from '../../shared/supabaseAdmin.js'
import { Errors }                     from '../../shared/errors.js'
import { encrypt, decryptNullable }   from '@syndicsage/crypto'
import type { EncryptedString }       from '@syndicsage/types'

export interface UnitRow {
  id:              string
  building_id:     string
  unit_number:     string
  unit_type:       string
  ownership_share: number
}

export interface OwnerRow {
  id:           string
  building_id:  string
  unit_id:      string
  member_id:    string | null
  full_name:    string
  email:        string
  phone:        string | null
  national_id:  EncryptedString | null   // encrypted — use decryptNullable() before returning
  bank_account: EncryptedString | null   // encrypted — use decryptNullable() before returning
  is_renter:    boolean
  created_at:   string
}

// Decrypted version safe to return to the API caller
export interface OwnerRowDecrypted extends Omit<OwnerRow, 'national_id' | 'bank_account'> {
  national_id:  string | null
  bank_account: string | null
}

export interface CreateOwnerInput {
  building_id:        string
  unit_number:        string
  unit_type:          string
  ownership_share:    number
  full_name:          string
  email?:             string
  phone?:             string
  national_id?:       string | null   // plaintext — encrypted before DB write
  is_renter:          boolean
  bank_account?:      string | null   // plaintext — encrypted before DB write
  preferred_language?: string
  mailing_address?:   string | null
  has_no_email?:      boolean
}

// Creates unit + owner in one logical operation.
// Returns the owner row with sensitive fields decrypted.
export async function createOwnerWithUnit(input: CreateOwnerInput): Promise<OwnerRowDecrypted> {
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
  // Encrypt sensitive fields before writing to DB
  const encryptedBankAccount = input.bank_account ? encrypt(input.bank_account) : null
  const encryptedNationalId  = input.national_id  ? encrypt(input.national_id)  : null

  const { data: owner, error: ownerErr } = await supabase
    .from('owners')
    .insert({
      building_id:        input.building_id,
      unit_id:            (unit as UnitRow).id,
      full_name:          input.full_name,
      email:              input.email,
      phone:              input.phone ?? null,
      national_id:        encryptedNationalId,
      is_renter:          input.is_renter,
      bank_account:       encryptedBankAccount,
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

  return decryptOwnerRow(owner as OwnerRow)
}

export interface UpdateOwnerInput {
  full_name?:          string
  email?:              string
  phone?:              string | null
  national_id?:        string | null   // plaintext — encrypted before DB write
  is_renter?:          boolean
  bank_account?:       string | null   // plaintext — encrypted before DB write
  preferred_language?: string
  mailing_address?:    string | null
  has_no_email?:       boolean
}

export async function updateOwner(
  ownerId:    string,
  buildingId: string,
  input:      UpdateOwnerInput,
): Promise<OwnerRowDecrypted> {
  const supabase = getSupabaseAdmin()

  // Encrypt sensitive fields before writing; undefined = no change
  const dbUpdate: Record<string, unknown> = { ...input }
  if ('bank_account' in input) {
    dbUpdate['bank_account'] = input.bank_account ? encrypt(input.bank_account) : null
  }
  if ('national_id' in input) {
    dbUpdate['national_id'] = input.national_id ? encrypt(input.national_id) : null
  }

  const { data, error } = await supabase
    .from('owners')
    .update(dbUpdate)
    .eq('id', ownerId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) throw Errors.notFound('Owner')
  return decryptOwnerRow(data as OwnerRow)
}

// ── Decrypt helper ─────────────────────────────────────────────
// Called after every DB read — decrypts sensitive fields before they
// leave the repository layer. Never return EncryptedString to the API caller.
function decryptOwnerRow(row: OwnerRow): OwnerRowDecrypted {
  return {
    ...row,
    national_id:  decryptNullable(row.national_id),
    bank_account: decryptNullable(row.bank_account),
  }
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
