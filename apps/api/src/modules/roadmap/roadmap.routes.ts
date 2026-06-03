// ── Roadmap routes ─────────────────────────────────────────────
// GET    /api/v1/roadmap?building_id=  — list items
// POST   /api/v1/roadmap?building_id=  — create
// PATCH  /api/v1/roadmap/:id           — update
// DELETE /api/v1/roadmap/:id           — soft delete

import { Hono } from 'hono'
import { z }    from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }        from '../../shared/authorize.js'
import { Errors }           from '../../shared/errors.js'
import { logAudit }         from '../../shared/logAudit.js'
import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

const CreateInput = z.object({
  title:          z.string().min(1).max(200),
  description:    z.string().max(1000).optional(),
  status:         z.enum(['planned', 'in_progress', 'done']).default('planned'),
  priority:       z.enum(['low', 'medium', 'high']).default('medium'),
  estimated_cost: z.number().positive().optional(),
  target_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const UpdateInput = CreateInput.partial()

const VALID_STATUSES   = ['planned', 'in_progress', 'done'] as const
const VALID_PRIORITIES = ['low', 'medium', 'high'] as const

router.get('/', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'roadmap.read')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('roadmap_items')
    .select('*')
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .order('priority', { ascending: false })
    .order('target_date', { ascending: true })

  if (error) throw Errors.internal()
  return c.json(data ?? [])
})

router.post('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'roadmap.create')

  const body   = await c.req.json().catch(() => null)
  const parsed = CreateInput.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')

  const d = parsed.data
  if (!VALID_STATUSES.includes(d.status))   throw Errors.badRequest('Invalid status')
  if (!VALID_PRIORITIES.includes(d.priority)) throw Errors.badRequest('Invalid priority')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('roadmap_items')
    .insert({
      building_id:     buildingId,
      organization_id: member.organization_id,
      title:           d.title,
      description:     d.description ?? null,
      status:          d.status,
      priority:        d.priority,
      estimated_cost:  d.estimated_cost ?? null,
      target_date:     d.target_date ?? null,
    })
    .select()
    .single()

  if (error || !data) throw Errors.internal()

  await logAudit({ actor_id: userId, action: 'roadmap_item.created', resource_type: 'roadmap_item', resource_id: (data as { id: string }).id, building_id: buildingId, organization_id: member.organization_id })
  return c.json(data, 201)
})

router.patch('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const id         = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'roadmap.update')

  const body   = await c.req.json().catch(() => null)
  const parsed = UpdateInput.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')

  const d = parsed.data
  if (d.status   && !VALID_STATUSES.includes(d.status))   throw Errors.badRequest('Invalid status')
  if (d.priority && !VALID_PRIORITIES.includes(d.priority)) throw Errors.badRequest('Invalid priority')

  const supabase = getSupabaseAdmin()

  // Ownership check
  const { data: existing } = await supabase.from('roadmap_items').select('id').eq('id', id).eq('building_id', buildingId).single()
  if (!existing) throw Errors.notFound('Roadmap item')

  const { data, error } = await supabase.from('roadmap_items').update(d).eq('id', id).select().single()
  if (error || !data) throw Errors.internal()

  await logAudit({ actor_id: userId, action: 'roadmap_item.updated', resource_type: 'roadmap_item', resource_id: id, building_id: buildingId, organization_id: member.organization_id })
  return c.json(data)
})

router.delete('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const id         = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'roadmap.update')

  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase.from('roadmap_items').select('id').eq('id', id).eq('building_id', buildingId).single()
  if (!existing) throw Errors.notFound('Roadmap item')

  await supabase.from('roadmap_items').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  await logAudit({ actor_id: userId, action: 'roadmap_item.deleted', resource_type: 'roadmap_item', resource_id: id, building_id: buildingId, organization_id: member.organization_id })
  return c.body(null, 204)
})

export { router as roadmapRouter }
