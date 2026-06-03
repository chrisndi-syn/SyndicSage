import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { attachContext }  from './shared/middleware/attachContext.js'
import { resolveTenant }  from './shared/middleware/resolveTenant.js'
import { verifyAccess }   from './shared/middleware/verifyAccess.js'
import { AppError }       from './shared/errors.js'
import { sessionsRouter }    from './modules/sessions/sessions.routes.js'
import { buildingsRouter }   from './modules/buildings/buildings.routes.js'
import { ownersRouter }      from './modules/owners/owners.routes.js'
import { chargesRouter }     from './modules/charges/charges.routes.js'
import { expensesRouter }    from './modules/expenses/expenses.routes.js'
import { incomeRouter }      from './modules/income/income.routes.js'
import { budgetLinesRouter } from './modules/budget-lines/budgetLines.routes.js'
import { bilanRouter }            from './modules/bilan/bilan.routes.js'
import { ticketsRouter }          from './modules/tickets/tickets.routes.js'
import { insuranceRouter }        from './modules/insurance/insurance.routes.js'
import { contractorsRouter }      from './modules/contractors/contractors.routes.js'
import { supplierContractsRouter } from './modules/supplier-contracts/supplierContracts.routes.js'
import { letterTemplatesRouter }  from './modules/letter-templates/letterTemplates.routes.js'
import { documentsRouter }        from './modules/documents/documents.routes.js'
import { timelineRouter }         from './modules/timeline/timeline.routes.js'
import { aiRouter }               from './modules/ai/ai.routes.js'
import { roadmapRouter }          from './modules/roadmap/roadmap.routes.js'
import { meetingsRouter }         from './modules/meetings/meetings.routes.js'
import { reportsRouter }          from './modules/reports/reports.routes.js'

const app = new Hono()

// ── Health check (no auth) ────────────────────────────────────
app.get('/healthz', (c) => c.json({ status: 'ok' }))

// ── Authenticated routes ──────────────────────────────────────
// Middleware chain: attachContext → resolveTenant → verifyAccess
// Every route below this line has a verified user + building context.
const api = new Hono()

api.use('*', attachContext)
api.use('*', resolveTenant)
api.use('*', verifyAccess)

// ── Feature routes ────────────────────────────────────────────
api.route('/sessions',     sessionsRouter)
api.route('/buildings',    buildingsRouter)
api.route('/owners',       ownersRouter)
api.route('/charges',      chargesRouter)
api.route('/expenses',     expensesRouter)
api.route('/income',       incomeRouter)
api.route('/budget-lines', budgetLinesRouter)
api.route('/bilan',             bilanRouter)
api.route('/tickets',           ticketsRouter)
api.route('/insurance',         insuranceRouter)
api.route('/contractors',       contractorsRouter)
api.route('/supplier-contracts', supplierContractsRouter)
api.route('/letter-templates',  letterTemplatesRouter)
api.route('/documents',         documentsRouter)
api.route('/timeline',          timelineRouter)
api.route('/ai',                aiRouter)
api.route('/roadmap',           roadmapRouter)
api.route('/meetings',          meetingsRouter)
api.route('/reports',           reportsRouter)

app.route('/api/v1', api)

// ── Global error handler ──────────────────────────────────────
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      { code: err.code, message: err.message, details: err.details },
      err.status as 400 | 401 | 403 | 404 | 409 | 500,
    )
  }

  // Unexpected error — log internally, never expose details to client
  console.error('[unhandled error]', err)
  return c.json({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }, 500)
})

// ── Start server ──────────────────────────────────────────────
const rawPort = parseInt(process.env['PORT'] ?? '3001', 10)
const PORT = isNaN(rawPort) || rawPort < 1 || rawPort > 65535 ? 3001 : rawPort

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`API running on http://localhost:${PORT}`)
})

export default app
