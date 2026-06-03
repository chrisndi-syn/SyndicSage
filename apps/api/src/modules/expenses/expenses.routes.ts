// ── Expenses routes ───────────────────────────────────────────
// GET    /api/v1/expenses?building_id=&year=        — list by year
// POST   /api/v1/expenses?building_id=              — create
// PATCH  /api/v1/expenses/:id?building_id=          — update
// DELETE /api/v1/expenses/:id?building_id=          — soft-delete

import { Hono } from 'hono'
import { z }    from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }    from '../../shared/authorize.js'
import { Errors }       from '../../shared/errors.js'
import { logAudit }     from '../../shared/logAudit.js'
import {
  listExpenses, createExpense, updateExpense, softDeleteExpense,
} from './expenses.api.js'
import { canWriteExpense, canDeleteExpense } from './expenses.policy.js'

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
  authorize(member.role as UserRole, 'expense.read')
  if (isNaN(year) || year < 2000 || year > 2100) throw Errors.badRequest('Invalid year')

  const expenses = await listExpenses(buildingId, year)
  return c.json(expenses)
})

// ── POST / ────────────────────────────────────────────────────
const CreateExpenseSchema = z.object({
  date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  description:     z.string().min(1).max(500),
  amount:          z.number().positive(),
  category:        z.string().min(1).max(100),
  supplier:        z.string().max(200).nullable().optional(),
  reference:       z.string().max(100).nullable().optional(),
  accounting_code: z.string().min(1).max(10),
  notes:           z.string().nullable().optional(),
})

router.post('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'expense.create')
  if (!canWriteExpense(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = CreateExpenseSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const expense = await createExpense({
    building_id:     buildingId,
    organization_id: member.organization_id,
    ...parsed.data,
  })

  await logAudit({
    actor_id:        userId,
    action:          'expense_create',
    resource_type:   'expense',
    resource_id:     expense.id,
    building_id:     buildingId,
    organization_id: member.organization_id,
    metadata:        { description: expense.description, amount: expense.amount },
  })

  return c.json(expense, 201)
})

// ── PATCH /:id ────────────────────────────────────────────────
const UpdateExpenseSchema = z.object({
  date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description:     z.string().min(1).max(500).optional(),
  amount:          z.number().positive().optional(),
  category:        z.string().min(1).max(100).optional(),
  supplier:        z.string().max(200).nullable().optional(),
  reference:       z.string().max(100).nullable().optional(),
  accounting_code: z.string().min(1).max(10).optional(),
  notes:           z.string().nullable().optional(),
})

router.patch('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const expenseId  = c.req.param('id')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'expense.update')
  if (!canWriteExpense(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = UpdateExpenseSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const updated = await updateExpense(expenseId, buildingId, parsed.data)

  await logAudit({
    actor_id:      userId,
    action:        'expense_update',
    resource_type: 'expense',
    resource_id:   expenseId,
    building_id:   buildingId,
  })

  return c.json(updated)
})

// ── DELETE /:id ───────────────────────────────────────────────
router.delete('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const expenseId  = c.req.param('id')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'expense.delete')
  if (!canDeleteExpense(member.role as UserRole)) throw Errors.forbidden()

  await softDeleteExpense(expenseId, buildingId)

  await logAudit({
    actor_id:      userId,
    action:        'expense_delete',
    resource_type: 'expense',
    resource_id:   expenseId,
    building_id:   buildingId,
  })

  return c.body(null, 204)
})

export { router as expensesRouter }
