// ── Reports routes ──────────────────────────────────────────────
// GET /api/v1/reports?building_id=  — portfolio snapshot

import { Hono } from 'hono'
import type { UserRole } from '@syndicsage/types'
import { authorize }        from '../../shared/authorize.js'
import { Errors }           from '../../shared/errors.js'
import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

router.get('/', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'meeting.read')

  const supabase = getSupabaseAdmin()

  const [
    { data: building },
    { data: charges },
    { data: expenses },
    { data: income },
    { data: tickets },
    { data: meetings },
    { data: owners },
  ] = await Promise.all([
    supabase.from('buildings').select('name,unit_count,annual_budget,reserve_fund_balance,ag_date,mandate_expiry').eq('id', buildingId).single(),
    supabase.from('charges').select('amount,status').eq('building_id', buildingId).is('deleted_at', null),
    supabase.from('expenses').select('amount').eq('building_id', buildingId).eq('year', new Date().getFullYear()),
    supabase.from('income').select('amount').eq('building_id', buildingId).eq('year', new Date().getFullYear()),
    supabase.from('tickets').select('status').eq('building_id', buildingId).is('deleted_at', null),
    supabase.from('meetings').select('date,status,title').eq('building_id', buildingId).is('deleted_at', null).order('date', { ascending: false }).limit(5),
    supabase.from('units').select('id,unit_number').eq('building_id', buildingId),
  ])

  const chargesArr  = (charges  ?? []) as Array<{ amount: number; status: string }>
  const expensesArr = (expenses ?? []) as Array<{ amount: number }>
  const incomeArr   = (income   ?? []) as Array<{ amount: number }>
  const ticketsArr  = (tickets  ?? []) as Array<{ status: string }>

  const totalCharged = chargesArr.reduce((s, r) => s + (r.amount ?? 0), 0)
  const totalPaid    = chargesArr.filter(r => r.status === 'paid').reduce((s, r) => s + (r.amount ?? 0), 0)
  const totalPending = chargesArr.filter(r => r.status !== 'paid').reduce((s, r) => s + (r.amount ?? 0), 0)

  const totalExpenses = expensesArr.reduce((s, r) => s + (r.amount ?? 0), 0)
  const totalIncome   = incomeArr.reduce((s, r) => s + (r.amount ?? 0), 0)

  const openTickets     = ticketsArr.filter(r => r.status === 'open' || r.status === 'in_progress').length
  const resolvedTickets = ticketsArr.filter(r => r.status === 'resolved' || r.status === 'closed').length

  return c.json({
    building,
    charges: { total: totalCharged, paid: totalPaid, pending: totalPending, count: chargesArr.length },
    accounting: { expenses: totalExpenses, income: totalIncome, net: totalIncome - totalExpenses, year: new Date().getFullYear() },
    tickets: { open: openTickets, resolved: resolvedTickets, total: ticketsArr.length },
    recentMeetings: meetings ?? [],
    unitCount: (owners ?? []).length,
  })
})

export { router as reportsRouter }
