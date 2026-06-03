// ── Bilan routes ──────────────────────────────────────────────
// GET /api/v1/bilan?building_id=&year=   — annual balance sheet summary
// PATCH /api/v1/bilan/bank?building_id=  — update bank balances inline

import { Hono }          from 'hono'
import { z }             from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }     from '../../shared/authorize.js'
import { Errors }        from '../../shared/errors.js'
import { logAudit }      from '../../shared/logAudit.js'
import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

// ── GET / — annual bilan summary ─────────────────────────────
router.get('/', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const yearParam  = c.req.query('year')
  const year       = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'bilan.read')
  if (isNaN(year) || year < 2000 || year > 2100) throw Errors.badRequest('Invalid year')

  const supabase = getSupabaseAdmin()

  // Fetch all data in parallel
  const [buildingResult, expensesResult, incomeResult, chargesResult] = await Promise.all([
    supabase
      .from('buildings')
      .select('bank_vue, bank_epargne, reserve_fund_balance, starting_balance')
      .eq('id', buildingId)
      .single(),
    supabase
      .from('expenses')
      .select('accounting_code, category, amount')
      .eq('building_id', buildingId)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .is('deleted_at', null),
    supabase
      .from('income')
      .select('amount')
      .eq('building_id', buildingId)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .is('deleted_at', null),
    supabase
      .from('charges')
      .select('amount')
      .eq('building_id', buildingId)
      .in('status', ['pending', 'overdue'])
      .is('deleted_at', null),
  ])

  if (buildingResult.error || !buildingResult.data) throw Errors.notFound('Building')

  const building = buildingResult.data

  // Aggregate expenses
  const totalExpenses     = (expensesResult.data ?? []).reduce((s, e) => s + Number(e.amount), 0)
  const totalIncome       = (incomeResult.data   ?? []).reduce((s, i) => s + Number(i.amount), 0)
  const totalReceivables  = (chargesResult.data  ?? []).reduce((s, c) => s + Number(c.amount), 0)

  // Expenses by accounting code
  const expensesByCode: Record<string, number> = {}
  for (const exp of expensesResult.data ?? []) {
    const code = exp.accounting_code as string
    expensesByCode[code] = (expensesByCode[code] ?? 0) + Number(exp.amount)
  }

  const bankVue           = Number(building.bank_vue    ?? 0)
  const bankEpargne       = Number(building.bank_epargne ?? 0)
  const reserveFund       = Number(building.reserve_fund_balance ?? 0)
  const netResult         = totalIncome - totalExpenses
  const totalActif        = bankVue + bankEpargne + totalReceivables
  const totalPassif       = reserveFund + netResult

  return c.json({
    year,
    building_id:           buildingId,
    bank_vue:              bankVue,
    bank_epargne:          bankEpargne,
    total_receivables:     totalReceivables,
    total_actif:           totalActif,
    reserve_fund_balance:  reserveFund,
    total_income:          totalIncome,
    total_expenses:        totalExpenses,
    net_result:            netResult,
    total_passif:          totalPassif,
    expenses_by_code:      expensesByCode,
  })
})

// ── PATCH /bank — update bank balances inline ─────────────────
const UpdateBankSchema = z.object({
  bank_vue:             z.number().nonnegative().optional(),
  bank_epargne:         z.number().nonnegative().optional(),
  reserve_fund_balance: z.number().nonnegative().optional(),
  starting_balance:     z.number().nullable().optional(),
})

router.patch('/bank', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'bilan.read')   // same gate — syndic/co_syndic only
  if (member.role !== 'syndic' && member.role !== 'co_syndic') throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = UpdateBankSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')
  if (Object.keys(parsed.data).length === 0) throw Errors.badRequest('No fields to update')

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('buildings')
    .update(parsed.data)
    .eq('id', buildingId)

  if (error) throw Errors.internal()

  await logAudit({
    actor_id:      userId,
    action:        'building_update',
    resource_type: 'building',
    resource_id:   buildingId,
    building_id:   buildingId,
    metadata:      { fields: Object.keys(parsed.data), context: 'bilan_bank_update' },
  })

  return c.json({ ok: true })
})

export { router as bilanRouter }
