// ── Settings / Admin Console routes ──────────────────────────
// GET    /api/v1/settings/org               — get org details
// PATCH  /api/v1/settings/org               — update org name/vat
// GET    /api/v1/settings/members           — all members across org's buildings
// DELETE /api/v1/settings/members/:userId/:buildingId — remove member
// GET    /api/v1/settings/feature-flags     — list all flags
// PATCH  /api/v1/settings/feature-flags/:key — toggle flag
// GET    /api/v1/settings/audit-log         — paginated audit log (syndic only)
// GET    /api/v1/settings/gdpr              — list GDPR requests
// PATCH  /api/v1/settings/gdpr/:id          — process a GDPR request

import { Hono } from 'hono'
import { z }    from 'zod'
import { authorize }        from '../../shared/authorize.js'
import { Errors }           from '../../shared/errors.js'
import { logAudit }         from '../../shared/logAudit.js'
import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { getOrgForUser }    from '../buildings/buildings.api.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

// ── Helper: resolve org id and assert role ────────────────────
async function getOrgAndRole(userId: string, action: string) {
  const supabase = getSupabaseAdmin()

  // Get user's role (they may be syndic of any building in the org)
  const { data: memberRows } = await supabase
    .from('building_members')
    .select('role')
    .eq('user_id', userId)
    .limit(1)

  const role = (memberRows?.[0] as { role: string } | undefined)?.role ?? 'renter'
  authorize(role as Parameters<typeof authorize>[0], action)

  const org = await getOrgForUser(userId)
  return { orgId: org.id, role }
}

// ── GET /settings/org ─────────────────────────────────────────
router.get('/org', async (c) => {
  const userId = c.get('userId')
  const { orgId } = await getOrgAndRole(userId, 'settings.read')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, vat_number, plan, created_at')
    .eq('id', orgId)
    .is('deleted_at', null)
    .single()

  if (error || !data) throw Errors.notFound('Organization')
  return c.json(data)
})

// ── PATCH /settings/org ───────────────────────────────────────
const UpdateOrgSchema = z.object({
  name:       z.string().min(1).max(200).optional(),
  vat_number: z.string().max(30).optional(),
})

router.patch('/org', async (c) => {
  const userId = c.get('userId')
  const { orgId } = await getOrgAndRole(userId, 'org.update')

  const body = await c.req.json()
  const parsed = UpdateOrgSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('organizations')
    .update(parsed.data)
    .eq('id', orgId)
    .select('id, name, vat_number, plan')
    .single()

  if (error) throw Errors.internal()

  await logAudit({ actor_id: userId, action: 'settings_updated', resource_type: 'organization', resource_id: orgId })
  return c.json(data)
})

// ── GET /settings/members ─────────────────────────────────────
// Returns all building_members + their profile for this org.
router.get('/members', async (c) => {
  const userId = c.get('userId')
  const { orgId } = await getOrgAndRole(userId, 'member.read')

  const supabase = getSupabaseAdmin()

  // Get all buildings for this org
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, name')
    .eq('organization_id', orgId)
    .is('deleted_at', null)

  if (!buildings?.length) return c.json([])

  const buildingIds = buildings.map((b: { id: string; name: string }) => b.id)

  const { data: members, error } = await supabase
    .from('building_members')
    .select('id, user_id, building_id, role, unit_id, joined_at, created_at')
    .in('building_id', buildingIds)

  if (error) throw Errors.internal()

  // Enrich with profile info
  const userIds = [...new Set((members ?? []).map((m: { user_id: string }) => m.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', userIds as string[])

  const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]))
  const buildingMap = new Map(buildings.map((b: { id: string; name: string }) => [b.id, b.name]))

  const rows = (members ?? []).map((m: {
    id: string; user_id: string; building_id: string; role: string;
    unit_id: string | null; joined_at: string | null; created_at: string;
  }) => ({
    ...m,
    profile: profileMap.get(m.user_id) ?? null,
    building_name: buildingMap.get(m.building_id) ?? '',
  }))

  return c.json(rows)
})

// ── DELETE /settings/members/:userId/:buildingId ──────────────
router.delete('/members/:targetUserId/:buildingId', async (c) => {
  const userId       = c.get('userId')
  const targetUserId = c.req.param('targetUserId')
  const buildingId   = c.req.param('buildingId')

  const { orgId } = await getOrgAndRole(userId, 'member.remove')

  // Verify the building belongs to this org
  const supabase = getSupabaseAdmin()
  const { data: building } = await supabase
    .from('buildings')
    .select('id')
    .eq('id', buildingId)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .single()

  if (!building) throw Errors.notFound('Building')

  // Cannot remove yourself
  if (targetUserId === userId) throw Errors.badRequest('Cannot remove yourself')

  const { error } = await supabase
    .from('building_members')
    .delete()
    .eq('user_id', targetUserId)
    .eq('building_id', buildingId)

  if (error) throw Errors.internal()

  await logAudit({ actor_id: userId, action: 'member_removed', resource_type: 'building_member', resource_id: targetUserId, building_id: buildingId })
  return c.json({ ok: true })
})

// ── GET /settings/feature-flags ──────────────────────────────
router.get('/feature-flags', async (c) => {
  const userId = c.get('userId')
  await getOrgAndRole(userId, 'settings.read')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('feature_flags')
    .select('key, enabled, description')
    .order('key')

  if (error) throw Errors.internal()
  return c.json(data ?? [])
})

// ── PATCH /settings/feature-flags/:key ───────────────────────
const UpdateFlagSchema = z.object({ enabled: z.boolean() })

router.patch('/feature-flags/:key', async (c) => {
  const userId = c.get('userId')
  const key    = c.req.param('key')
  await getOrgAndRole(userId, 'settings.update')

  const body = await c.req.json()
  const parsed = UpdateFlagSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest('enabled must be boolean')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('feature_flags')
    .update({ enabled: parsed.data.enabled })
    .eq('key', key)
    .select('key, enabled, description')
    .single()

  if (error) throw Errors.notFound('Feature flag')

  await logAudit({ actor_id: userId, action: 'settings_updated', resource_type: 'feature_flag', resource_id: key })
  return c.json(data)
})

// ── GET /settings/audit-log ───────────────────────────────────
router.get('/audit-log', async (c) => {
  const userId = c.get('userId')
  await getOrgAndRole(userId, 'audit.read')

  const org = await getOrgForUser(userId)
  const rawPage  = parseInt(c.req.query('page')  ?? '1',  10)
  const rawLimit = parseInt(c.req.query('limit') ?? '50', 10)
  const page  = Math.max(1,   isNaN(rawPage)  ? 1  : rawPage)
  const limit = Math.min(100, isNaN(rawLimit) ? 50 : rawLimit)
  const offset = (page - 1) * limit

  const supabase = getSupabaseAdmin()

  // Get all buildings in org for scoping
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id')
    .eq('organization_id', org.id)
    .is('deleted_at', null)

  const buildingIds = (buildings ?? []).map((b: { id: string }) => b.id)

  // Audit log: org-level entries (building_id = null) + all org buildings
  let query = supabase
    .from('audit_log')
    .select('id, user_id, building_id, action, resource_type, resource_id, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (buildingIds.length > 0) {
    query = query.or(`building_id.in.(${buildingIds.join(',')}),building_id.is.null`)
  } else {
    query = query.is('building_id', null)
  }

  const { data, error } = await query
  if (error) throw Errors.internal()

  // Enrich with profile names
  const userIds = [...new Set((data ?? []).map((row: { user_id: string }) => row.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds as string[])

  const profileMap = new Map((profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]))

  const rows = (data ?? []).map((row: {
    id: string; user_id: string; building_id: string | null;
    action: string; resource_type: string; resource_id: string | null; created_at: string;
  }) => ({
    ...row,
    user_name: profileMap.get(row.user_id) ?? row.user_id,
  }))

  return c.json({ rows, page, limit })
})

// ── GET /settings/gdpr ────────────────────────────────────────
router.get('/gdpr', async (c) => {
  const userId = c.get('userId')
  await getOrgAndRole(userId, 'gdpr.process')

  const org = await getOrgForUser(userId)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('gdpr_requests')
    .select('id, user_id, type, status, notes, deadline_at, created_at')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })

  if (error) throw Errors.internal()

  // Enrich with profile emails
  const userIds = [...new Set((data ?? []).map((r: { user_id: string }) => r.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds as string[])

  const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]))

  const rows = (data ?? []).map((r: {
    id: string; user_id: string; type: string; status: string;
    notes: string | null; deadline_at: string; created_at: string;
  }) => ({
    ...r,
    profile: profileMap.get(r.user_id) ?? null,
  }))

  return c.json(rows)
})

// ── PATCH /settings/gdpr/:id ──────────────────────────────────
const UpdateGdprSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'denied']),
  notes:  z.string().max(1000).optional(),
})

router.patch('/gdpr/:id', async (c) => {
  const userId    = c.get('userId')
  const requestId = c.req.param('id')
  await getOrgAndRole(userId, 'gdpr.process')

  const body = await c.req.json()
  const parsed = UpdateGdprSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('gdpr_requests')
    .update({ status: parsed.data.status, notes: parsed.data.notes })
    .eq('id', requestId)
    .select('id, status, notes')
    .single()

  if (error) throw Errors.notFound('GDPR request')

  await logAudit({ actor_id: userId, action: 'gdpr_request_processed', resource_type: 'gdpr_request', resource_id: requestId })
  return c.json(data)
})

export { router as settingsRouter }
