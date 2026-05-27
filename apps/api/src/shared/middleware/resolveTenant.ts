import type { Context, Next } from 'hono'
import { Errors } from '../errors.js'
import { getSupabaseAdmin } from '../supabaseAdmin.js'

// ── resolveTenant ─────────────────────────────────────────────
// Step 1 of the middleware chain.
// Extracts building_id from the request and confirms it exists.
// Does NOT check membership — that is verifyAccess()'s job.
//
// building_id comes from:
//  - Route param:  /buildings/:buildingId/...
//  - Query string: ?building_id=uuid
//  - Request body: { building_id }  (POST/PATCH)

export async function resolveTenant(c: Context, next: Next) {
  const buildingId =
    c.req.param('buildingId') ??
    c.req.query('building_id')

  if (!buildingId) {
    // Some routes are org-level (no building). Mark as resolved with null.
    c.set('buildingId', null)
    return next()
  }

  // Validate UUID format before hitting the DB
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRe.test(buildingId)) {
    throw Errors.badRequest('Invalid building_id format')
  }

  // Verify the building actually exists (fail early with 404, not 403)
  const supabase = getSupabaseAdmin()
  const { error: buildingErr } = await supabase
    .from('buildings')
    .select('id')
    .eq('id', buildingId)
    .is('deleted_at', null)
    .single()

  if (buildingErr) throw Errors.notFound('Building not found')

  c.set('buildingId', buildingId)
  return next()
}
