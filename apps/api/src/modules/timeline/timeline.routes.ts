// ── Timeline routes ───────────────────────────────────────────
// GET /api/v1/timeline?building_id= — audit log for a building

import { Hono }        from 'hono'
import type { UserRole } from '@syndicsage/types'
import { authorize }   from '../../shared/authorize.js'
import { Errors }      from '../../shared/errors.js'
import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

// GET / — fetch audit log for a building (syndic + co_syndic only)
router.get('/', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')

  if (!member || !buildingId) throw Errors.forbidden()

  const role = member.role as UserRole
  authorize(role, 'timeline.read')

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('audit_log')
    .select('id, actor_id, action, resource_type, resource_id, metadata, created_at')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) { console.error('[timeline]', error.message); throw Errors.internal() }

  return c.json(data ?? [])
})

export { router as timelineRouter }
