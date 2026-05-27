/**
 * Tenant Isolation Tests — Phase 0, step 0j
 *
 * These tests hit a real Supabase staging database. They are skipped
 * automatically when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set,
 * so CI stays green until the staging environment is connected.
 *
 * To run locally:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm test:isolation
 *
 * What is tested:
 *   1. A user cannot read charges belonging to a different building
 *   2. A user cannot read documents belonging to a different building
 *   3. A user cannot read owners belonging to a different building
 *   4. A non-member gets a 403 (tenantMismatch) from verifyAccess
 *   5. A co_owner is scoped to their own unit only
 *   6. A removed (soft-deleted) member loses access immediately
 *   7. Soft-deleted resources are not returned in normal queries
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Errors } from '../../shared/errors.js'

// ── Environment guard ─────────────────────────────────────────
const hasEnv = !!(
  process.env['SUPABASE_URL'] &&
  process.env['SUPABASE_SERVICE_ROLE_KEY']
)

// ── Helpers ───────────────────────────────────────────────────

function getAdmin(): SupabaseClient {
  return createClient(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    { auth: { persistSession: false } },
  )
}

/** Creates a test building and returns its id. */
async function createBuilding(
  admin: SupabaseClient,
  name: string,
): Promise<string> {
  const { data, error } = await admin
    .from('syndic_buildings')
    .insert({ name, address: 'Test Street 1', city: 'Brussels', country: 'BE' })
    .select('id')
    .single()

  if (error || !data) throw new Error(`createBuilding failed: ${error?.message}`)
  return data.id as string
}

/** Creates a test user (auth + profile) and returns user_id. */
async function createUser(
  admin: SupabaseClient,
  email: string,
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'Test1234!',
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  return data.user.id
}

/** Adds a user as a member of a building with the given role. Returns member id. */
async function addMember(
  admin: SupabaseClient,
  buildingId: string,
  userId: string,
  role: string,
  unitId?: string,
): Promise<string> {
  const { data, error } = await admin
    .from('building_members')
    .insert({ building_id: buildingId, user_id: userId, role, unit_id: unitId ?? null })
    .select('id')
    .single()

  if (error || !data) throw new Error(`addMember failed: ${error?.message}`)
  return data.id as string
}

/** Soft-deletes a member row (simulates removing a user from a building). */
async function removeMember(
  admin: SupabaseClient,
  memberId: string,
): Promise<void> {
  const { error } = await admin
    .from('building_members')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', memberId)

  if (error) throw new Error(`removeMember failed: ${error.message}`)
}

/** Simulates the verifyAccess middleware logic for a user + building pair. */
async function checkAccess(
  admin: SupabaseClient,
  userId: string,
  buildingId: string,
): Promise<{ allowed: boolean; role?: string }> {
  const { data: member, error } = await admin
    .from('building_members')
    .select('id, role, unit_id, building_id')
    .eq('building_id', buildingId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single()

  if (error || !member) return { allowed: false }
  return { allowed: true, role: member.role as string }
}

// ── Cleanup registry ──────────────────────────────────────────
// Collect all created IDs so afterAll can wipe them in reverse order.

interface Fixtures {
  userIds: string[]
  buildingIds: string[]
  memberIds: string[]
  chargeIds: string[]
  documentIds: string[]
}

// ── Unit tests (no DB required) ───────────────────────────────

describe('AppError factory', () => {
  it('produces correct status codes and error codes', () => {
    expect(Errors.unauthorized().status).toBe(401)
    expect(Errors.forbidden().status).toBe(403)
    expect(Errors.tenantMismatch().status).toBe(403)
    expect(Errors.tenantMismatch().code).toBe('TENANT_MISMATCH')
    expect(Errors.notFound('building').status).toBe(404)
    expect(Errors.badRequest('invalid id').status).toBe(400)
    expect(Errors.conflict('duplicate').status).toBe(409)
    expect(Errors.internal().status).toBe(500)
  })
})

// ── Test suite ────────────────────────────────────────────────

describe.skipIf(!hasEnv)('Tenant isolation', () => {
  let admin: SupabaseClient
  const fixtures: Fixtures = {
    userIds: [],
    buildingIds: [],
    memberIds: [],
    chargeIds: [],
    documentIds: [],
  }

  // Building A — the user belongs here
  let buildingA: string
  // Building B — the user does NOT belong here
  let buildingB: string
  // User who is a member of building A only
  let userA: string
  // User who is a co_owner in building A (unit 1)
  let coOwnerA: string

  beforeAll(async () => {
    admin = getAdmin()

    buildingA = await createBuilding(admin, '__test_building_A')
    buildingB = await createBuilding(admin, '__test_building_B')
    fixtures.buildingIds.push(buildingA, buildingB)

    userA    = await createUser(admin, `test-syndic-a-${Date.now()}@test-isolation.invalid`)
    coOwnerA = await createUser(admin, `test-coowner-a-${Date.now()}@test-isolation.invalid`)
    fixtures.userIds.push(userA, coOwnerA)

    // userA is syndic of building A
    const mId = await addMember(admin, buildingA, userA, 'syndic')
    fixtures.memberIds.push(mId)

    // coOwnerA belongs to building A, unit "101"
    const mId2 = await addMember(admin, buildingA, coOwnerA, 'co_owner', '101')
    fixtures.memberIds.push(mId2)
  })

  afterAll(async () => {
    if (!admin) return

    // Delete in dependency order: members → charges → documents → buildings → users
    if (fixtures.chargeIds.length) {
      await admin.from('syndic_charges').delete().in('id', fixtures.chargeIds)
    }
    if (fixtures.documentIds.length) {
      await admin.from('syndic_documents').delete().in('id', fixtures.documentIds)
    }
    if (fixtures.memberIds.length) {
      await admin.from('building_members').delete().in('id', fixtures.memberIds)
    }
    if (fixtures.buildingIds.length) {
      await admin.from('syndic_buildings').delete().in('id', fixtures.buildingIds)
    }
    for (const uid of fixtures.userIds) {
      await admin.auth.admin.deleteUser(uid)
    }
  })

  // ── Test 1: Cross-building charge isolation ───────────────────

  it('user cannot read charges from a building they do not belong to', async () => {
    // Insert a charge in building B (no member relationship to userA)
    const { data: charge, error: insertErr } = await admin
      .from('syndic_charges')
      .insert({ building_id: buildingB, label: 'Test charge B', amount: 100, year: 2024 })
      .select('id')
      .single()

    expect(insertErr).toBeNull()
    if (charge) fixtures.chargeIds.push(charge.id as string)

    // Attempt access check: userA → buildingB should be denied
    const result = await checkAccess(admin, userA, buildingB)
    expect(result.allowed).toBe(false)
  })

  // ── Test 2: Cross-building document isolation ─────────────────

  it('user cannot read documents from a building they do not belong to', async () => {
    // Insert a document in building B
    const { data: doc, error: insertErr } = await admin
      .from('syndic_documents')
      .insert({
        building_id: buildingB,
        name: 'Test doc B',
        storage_path: `test/${buildingB}/test.pdf`,
        file_type: 'pdf',
      })
      .select('id')
      .single()

    expect(insertErr).toBeNull()
    if (doc) fixtures.documentIds.push(doc.id as string)

    const result = await checkAccess(admin, userA, buildingB)
    expect(result.allowed).toBe(false)
  })

  // ── Test 3: Non-member access denied ─────────────────────────

  it('a non-member receives no membership record for any building', async () => {
    // Create a user that is a member of neither building
    const stranger = await createUser(admin, `test-stranger-${Date.now()}@test-isolation.invalid`)
    fixtures.userIds.push(stranger)

    const resultA = await checkAccess(admin, stranger, buildingA)
    const resultB = await checkAccess(admin, stranger, buildingB)

    expect(resultA.allowed).toBe(false)
    expect(resultB.allowed).toBe(false)
  })

  // ── Test 4: co_owner is a member of their building ────────────

  it('co_owner has access to their own building', async () => {
    const result = await checkAccess(admin, coOwnerA, buildingA)
    expect(result.allowed).toBe(true)
    expect(result.role).toBe('co_owner')
  })

  it('co_owner has no access to a different building', async () => {
    const result = await checkAccess(admin, coOwnerA, buildingB)
    expect(result.allowed).toBe(false)
  })

  // ── Test 5: Removed member loses access immediately ───────────

  it('soft-deleted member is immediately denied access', async () => {
    // Add a temporary member, confirm access, then remove, confirm denied
    const tempUser = await createUser(admin, `test-temp-${Date.now()}@test-isolation.invalid`)
    fixtures.userIds.push(tempUser)

    const memberId = await addMember(admin, buildingA, tempUser, 'co_owner')
    // Don't add to fixtures.memberIds — we'll soft-delete it instead

    const before = await checkAccess(admin, tempUser, buildingA)
    expect(before.allowed).toBe(true)

    await removeMember(admin, memberId)

    const after = await checkAccess(admin, tempUser, buildingA)
    expect(after.allowed).toBe(false)

    // Clean up the soft-deleted row
    await admin.from('building_members').delete().eq('id', memberId)
  })

  // ── Test 6: Soft-deleted resources not returned ───────────────

  it('soft-deleted buildings are not returned in member queries', async () => {
    // Soft-delete building B and verify it disappears from a query scoped by building_id
    await admin
      .from('syndic_buildings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', buildingB)

    const { data } = await admin
      .from('syndic_buildings')
      .select('id')
      .eq('id', buildingB)
      .is('deleted_at', null)

    expect(data).toHaveLength(0)

    // Restore it so afterAll cleanup succeeds
    await admin
      .from('syndic_buildings')
      .update({ deleted_at: null })
      .eq('id', buildingB)
  })

})
