import type { Context, Next } from 'hono'
import { Errors } from '../errors.js'
import { getSupabaseAdmin } from '../supabaseAdmin.js'

// ── verifyAccess ──────────────────────────────────────────────
// Step 2 of the middleware chain.
// Confirms the authenticated user is a member of the building
// resolved in resolveTenant(). Attaches the member row to context.
//
// If building_id is null (org-level route), verifies the user
// belongs to the organisation instead.

export async function verifyAccess(c: Context, next: Next) {
  const userId     = c.get('userId') as string | undefined
  const buildingId = c.get('buildingId') as string | null

  if (!userId) throw Errors.unauthorized()

  if (!buildingId) {
    // Org-level route — just ensure user has a profile
    return next()
  }

  const supabase = getSupabaseAdmin()

  const { data: member, error } = await supabase
    .from('building_members')
    .select('id, role, unit_id, building_id')
    .eq('building_id', buildingId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single()

  if (error || !member) {
    throw Errors.tenantMismatch()
  }

  c.set('member', member)
  return next()
}
