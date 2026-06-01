// ── Charges routes ────────────────────────────────────────────
// POST   /api/v1/charges?building_id=          — create charge
// PATCH  /api/v1/charges/:chargeId?building_id= — update charge
// PATCH  /api/v1/charges/:chargeId/mark-paid?building_id= — mark paid
// DELETE /api/v1/charges/:chargeId?building_id= — soft-delete

import { Hono } from 'hono'
import { z }    from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }    from '../../shared/authorize.js'
import { Errors }       from '../../shared/errors.js'
import { logAudit }     from '../../shared/logAudit.js'
import {
  createCharge, updateCharge, markChargePaid, softDeleteCharge,
} from './charges.api.js'
import { canWriteCharge, canDeleteCharge, canMarkPaid } from './charges.policy.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

const PERIODS = ['monthly', 'quarterly', 'annual', 'one_time'] as const

// ── POST / ────────────────────────────────────────────────────
const CreateChargeSchema = z.object({
  owner_id: z.string().uuid().optional(),
  title:    z.string().min(1).max(200),
  amount:   z.number().positive(),
  period:   z.enum(PERIODS),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'due_date must be YYYY-MM-DD'),
  notes:    z.string().optional(),
})

router.post('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'charge.create')
  if (!canWriteCharge(member.role as UserRole)) throw Errors.forbidden()

  const body = await c.req.json()
  const parsed = CreateChargeSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const charge = await createCharge({ building_id: buildingId, ...parsed.data })

  await logAudit({
    actor_id:      userId,
    action:        'charge_create',
    resource_type: 'charge',
    resource_id:   charge.id,
    building_id:   buildingId,
    metadata:      { title: charge.title, amount: charge.amount },
  })

  return c.json(charge, 201)
})

// ── PATCH /:chargeId ──────────────────────────────────────────
const UpdateChargeSchema = z.object({
  title:    z.string().min(1).max(200).optional(),
  amount:   z.number().positive().optional(),
  period:   z.enum(PERIODS).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:    z.string().nullable().optional(),
})

router.patch('/:chargeId', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const chargeId   = c.req.param('chargeId')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'charge.update')
  if (!canWriteCharge(member.role as UserRole)) throw Errors.forbidden()

  const body = await c.req.json()
  const parsed = UpdateChargeSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const updated = await updateCharge(chargeId, buildingId, parsed.data)

  await logAudit({
    actor_id:      userId,
    action:        'charge_edit',
    resource_type: 'charge',
    resource_id:   chargeId,
    building_id:   buildingId,
  })

  return c.json(updated)
})

// ── PATCH /:chargeId/mark-paid ────────────────────────────────
router.patch('/:chargeId/mark-paid', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const chargeId   = c.req.param('chargeId')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'charge.mark_paid')
  if (!canMarkPaid(member.role as UserRole)) throw Errors.forbidden()

  const updated = await markChargePaid(chargeId, buildingId)

  await logAudit({
    actor_id:      userId,
    action:        'charge_mark_paid',
    resource_type: 'charge',
    resource_id:   chargeId,
    building_id:   buildingId,
  })

  return c.json(updated)
})

// ── DELETE /:chargeId ─────────────────────────────────────────
router.delete('/:chargeId', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const chargeId   = c.req.param('chargeId')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'charge.delete')
  if (!canDeleteCharge(member.role as UserRole)) throw Errors.forbidden()

  await softDeleteCharge(chargeId, buildingId)

  await logAudit({
    actor_id:      userId,
    action:        'charge_delete',
    resource_type: 'charge',
    resource_id:   chargeId,
    building_id:   buildingId,
  })

  return c.body(null, 204)
})

export { router as chargesRouter }
