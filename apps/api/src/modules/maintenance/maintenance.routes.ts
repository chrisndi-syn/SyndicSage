// ── Maintenance tasks routes ──────────────────────────────────
// GET    /api/v1/maintenance?building_id=   — list tasks
// POST   /api/v1/maintenance?building_id=   — create task
// PATCH  /api/v1/maintenance/:id            — update task
// POST   /api/v1/maintenance/:id/done       — mark done (advances next_due_date)
// DELETE /api/v1/maintenance/:id            — soft delete

import { Hono }          from 'hono'
import { z }             from 'zod'
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

const VALID_CATEGORIES = ['heating','gas','elevator','fire_safety','electrical','cleaning','structural','pest_control','plumbing','other'] as const
const VALID_PRIORITIES = ['high','medium','low'] as const
const VALID_FREQUENCIES = ['daily','weekly','monthly','quarterly','biannual','annual','biennial','as_needed'] as const

const TaskInput = z.object({
  title:              z.string().min(1).max(200),
  description:        z.string().max(1000).optional().nullable(),
  category:           z.enum(VALID_CATEGORIES).default('other'),
  priority:           z.enum(VALID_PRIORITIES).default('medium'),
  frequency:          z.enum(VALID_FREQUENCIES).default('annual'),
  next_due_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  remind_days_before: z.number().int().min(0).max(365).default(14),
  supplier_name:      z.string().max(200).optional().nullable(),
  notes:              z.string().max(1000).optional().nullable(),
})

router.get('/', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'maintenance.read.all')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('syndic_maintenance_tasks')
    .select('*')
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .order('next_due_date', { ascending: true })

  if (error) throw Errors.internal()
  return c.json(data ?? [])
})

router.post('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'maintenance.create')

  const body   = await c.req.json().catch(() => null)
  const parsed = TaskInput.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('syndic_maintenance_tasks')
    .insert({
      building_id:     buildingId,
      organization_id: member.organization_id,
      ...parsed.data,
    })
    .select()
    .single()

  if (error || !data) throw Errors.internal()
  await logAudit({ actor_id: userId, action: 'maintenance.created', resource_type: 'maintenance_task', resource_id: (data as { id: string }).id, building_id: buildingId, organization_id: member.organization_id })
  return c.json(data, 201)
})

router.patch('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const id         = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'maintenance.update')

  const body   = await c.req.json().catch(() => null)
  const parsed = TaskInput.partial().safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')

  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase
    .from('syndic_maintenance_tasks').select('id')
    .eq('id', id).eq('building_id', buildingId).is('deleted_at', null).single()
  if (!existing) throw Errors.notFound('Task')

  const { data, error } = await supabase
    .from('syndic_maintenance_tasks')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error || !data) throw Errors.internal()

  await logAudit({ actor_id: userId, action: 'maintenance.updated', resource_type: 'maintenance_task', resource_id: id, building_id: buildingId, organization_id: member.organization_id })
  return c.json(data)
})

router.post('/:id/done', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const id         = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'maintenance.update')

  const supabase = getSupabaseAdmin()
  const { data: task } = await supabase
    .from('syndic_maintenance_tasks').select('*')
    .eq('id', id).eq('building_id', buildingId).is('deleted_at', null).single()
  if (!task) throw Errors.notFound('Task')

  const t = task as { frequency: string; next_due_date: string | null }
  const today     = new Date()
  const base      = t.next_due_date ? new Date(t.next_due_date) : today
  const nextDue   = advanceDate(base, t.frequency)

  await supabase
    .from('syndic_maintenance_tasks')
    .update({ last_done_date: today.toISOString().slice(0, 10), next_due_date: nextDue, updated_at: new Date().toISOString() })
    .eq('id', id)

  await logAudit({ actor_id: userId, action: 'maintenance.done', resource_type: 'maintenance_task', resource_id: id, building_id: buildingId, organization_id: member.organization_id })
  return c.json({ ok: true, next_due_date: nextDue })
})

router.delete('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const id         = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'maintenance.update')

  const supabase = getSupabaseAdmin()
  await supabase.from('syndic_maintenance_tasks')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('building_id', buildingId)
  await logAudit({ actor_id: userId, action: 'maintenance.deleted', resource_type: 'maintenance_task', resource_id: id, building_id: buildingId, organization_id: member.organization_id })
  return c.body(null, 204)
})

function advanceDate(from: Date, frequency: string): string {
  const d = new Date(from)
  switch (frequency) {
    case 'daily':     d.setDate(d.getDate() + 1);       break
    case 'weekly':    d.setDate(d.getDate() + 7);       break
    case 'monthly':   d.setMonth(d.getMonth() + 1);     break
    case 'quarterly': d.setMonth(d.getMonth() + 3);     break
    case 'biannual':  d.setMonth(d.getMonth() + 6);     break
    case 'annual':    d.setFullYear(d.getFullYear() + 1); break
    case 'biennial':  d.setFullYear(d.getFullYear() + 2); break
    default:          d.setFullYear(d.getFullYear() + 1)
  }
  return d.toISOString().slice(0, 10)
}

export { router as maintenanceRouter }
