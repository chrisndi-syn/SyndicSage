// ── Income routes ─────────────────────────────────────────────
// GET    /api/v1/income?building_id=&year=   — list by year
// POST   /api/v1/income?building_id=         — create
// PATCH  /api/v1/income/:id?building_id=     — update
// DELETE /api/v1/income/:id?building_id=     — soft-delete

import { Hono } from 'hono'
import { z }    from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }    from '../../shared/authorize.js'
import { Errors }       from '../../shared/errors.js'
import { logAudit }     from '../../shared/logAudit.js'
import { listIncome, createIncome, updateIncome, softDeleteIncome } from './income.api.js'
import { canWriteIncome } from './income.policy.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

const INCOME_TYPES = ['provision', 'subsidy', 'insurance_refund', 'interest', 'other'] as const

// ── GET / ─────────────────────────────────────────────────────
router.get('/', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const yearParam  = c.req.query('year')
  const year       = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'income.read')
  if (isNaN(year) || year < 2000 || year > 2100) throw Errors.badRequest('Invalid year')

  const rows = await listIncome(buildingId, year)
  return c.json(rows)
})

// ── POST / ────────────────────────────────────────────────────
const CreateIncomeSchema = z.object({
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  type:        z.enum(INCOME_TYPES),
  description: z.string().min(1).max(500),
  amount:      z.number().positive(),
  owner_id:    z.string().uuid().nullable().optional(),
  reference:   z.string().max(100).nullable().optional(),
  notes:       z.string().nullable().optional(),
})

router.post('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'income.create')
  if (!canWriteIncome(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = CreateIncomeSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const row = await createIncome({
    building_id:     buildingId,
    organization_id: member.organization_id,
    ...parsed.data,
  })

  await logAudit({
    actor_id:        userId,
    action:          'income_create',
    resource_type:   'income',
    resource_id:     row.id,
    building_id:     buildingId,
    organization_id: member.organization_id,
    metadata:        { description: row.description, amount: row.amount, type: row.type },
  })

  return c.json(row, 201)
})

// ── PATCH /:id ────────────────────────────────────────────────
const UpdateIncomeSchema = z.object({
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type:        z.enum(INCOME_TYPES).optional(),
  description: z.string().min(1).max(500).optional(),
  amount:      z.number().positive().optional(),
  owner_id:    z.string().uuid().nullable().optional(),
  reference:   z.string().max(100).nullable().optional(),
  notes:       z.string().nullable().optional(),
})

router.patch('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const incomeId   = c.req.param('id')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'income.update')
  if (!canWriteIncome(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = UpdateIncomeSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const updated = await updateIncome(incomeId, buildingId, parsed.data)

  await logAudit({
    actor_id:      userId,
    action:        'income_update',
    resource_type: 'income',
    resource_id:   incomeId,
    building_id:   buildingId,
  })

  return c.json(updated)
})

// ── DELETE /:id ───────────────────────────────────────────────
router.delete('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const incomeId   = c.req.param('id')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'income.delete')
  if (!canWriteIncome(member.role as UserRole)) throw Errors.forbidden()

  await softDeleteIncome(incomeId, buildingId)

  await logAudit({
    actor_id:      userId,
    action:        'income_delete',
    resource_type: 'income',
    resource_id:   incomeId,
    building_id:   buildingId,
  })

  return c.body(null, 204)
})

export { router as incomeRouter }
