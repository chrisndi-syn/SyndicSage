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
    // Org-level route — verify user has a profile (belongs to an org)
    const supabase = getSupabaseAdmin()
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()
    if (profileErr || !profile) throw Errors.forbidden()
    return next()
  }

  const supabase = getSupabaseAdmin()

  // Fetch member + organization_id in parallel — org_id needed by routes that insert
  // records requiring it (expenses, income, budget_lines, etc.)
  const [memberResult, profileResult] = await Promise.all([
    supabase
      .from('building_members')
      .select('id, role, unit_id, building_id')
      .eq('building_id', buildingId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single(),
  ])

  if (memberResult.error || !memberResult.data) {
    throw Errors.tenantMismatch()
  }

  c.set('member', {
    ...memberResult.data,
    organization_id: profileResult.data?.organization_id ?? null,
  })
  return next()
}
