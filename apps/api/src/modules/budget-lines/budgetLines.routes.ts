// ── Budget Lines routes ───────────────────────────────────────
// GET    /api/v1/budget-lines?building_id=&year=  — list with actuals
// POST   /api/v1/budget-lines?building_id=        — create
// PATCH  /api/v1/budget-lines/:id?building_id=    — update
// DELETE /api/v1/budget-lines/:id?building_id=    — hard delete (no sensitive data)

import { Hono } from 'hono'
import { z }    from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }    from '../../shared/authorize.js'
import { Errors }       from '../../shared/errors.js'
import { logAudit }     from '../../shared/logAudit.js'
import {
  listBudgetLines, createBudgetLine, updateBudgetLine, deleteBudgetLine,
} from './budgetLines.api.js'
import { canWriteBudgetLine } from './budgetLines.policy.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

// ── GET / ─────────────────────────────────────────────────────
router.get('/', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const yearParam  = c.req.query('year')
  const year       = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'budget_line.read')
  if (isNaN(year) || year < 2000 || year > 2100) throw Errors.badRequest('Invalid year')

  const lines = await listBudgetLines(buildingId, year)
  return c.json(lines)
})

// ── POST / ────────────────────────────────────────────────────
const CreateBudgetLineSchema = z.object({
  year:            z.number().int().min(2000).max(2100),
  category:        z.string().min(1).max(100),
  description:     z.string().min(1).max(200),
  amount_budgeted: z.number().nonnegative(),
})

router.post('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'budget_line.create')
  if (!canWriteBudgetLine(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = CreateBudgetLineSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const line = await createBudgetLine({
    building_id:     buildingId,
    organization_id: member.organization_id,
    ...parsed.data,
  })

  await logAudit({
    actor_id:      userId,
    action:        'budget_line_create',
    resource_type: 'budget_line',
    resource_id:   line.id,
    building_id:   buildingId,
  })

  return c.json(line, 201)
})

// ── PATCH /:id ────────────────────────────────────────────────
const UpdateBudgetLineSchema = z.object({
  category:        z.string().min(1).max(100).optional(),
  description:     z.string().min(1).max(200).optional(),
  amount_budgeted: z.number().nonnegative().optional(),
})

router.patch('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const lineId     = c.req.param('id')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'budget_line.update')
  if (!canWriteBudgetLine(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = UpdateBudgetLineSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const updated = await updateBudgetLine(lineId, buildingId, parsed.data)

  await logAudit({
    actor_id:      userId,
    action:        'budget_line_update',
    resource_type: 'budget_line',
    resource_id:   lineId,
    building_id:   buildingId,
  })

  return c.json(updated)
})

// ── DELETE /:id ───────────────────────────────────────────────
router.delete('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const lineId     = c.req.param('id')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'budget_line.delete')
  if (!canWriteBudgetLine(member.role as UserRole)) throw Errors.forbidden()

  await deleteBudgetLine(lineId, buildingId)

  await logAudit({
    actor_id:      userId,
    action:        'budget_line_delete',
    resource_type: 'budget_line',
    resource_id:   lineId,
    building_id:   buildingId,
  })

  return c.body(null, 204)
})

export { router as budgetLinesRouter }
