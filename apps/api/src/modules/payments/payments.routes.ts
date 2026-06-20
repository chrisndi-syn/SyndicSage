// ── Payments routes (Mollie) ───────────────────────────────────
// POST   /api/v1/payments?building_id=    — create payment for a charge
// GET    /api/v1/payments/:id             — check payment status
// POST   /api/v1/payments/webhook         — Mollie webhook (no auth)

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

const CreatePaymentInput = z.object({
  charge_id: z.string().uuid(),
})

// ── POST / — initiate payment ────────────────────────────────

router.post('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'charge.read.own')

  const body   = await c.req.json().catch(() => null)
  const parsed = CreatePaymentInput.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')

  const supabase    = getSupabaseAdmin()
  const MOLLIE_KEY  = process.env['MOLLIE_API_KEY']
  const APP_URL     = process.env['APP_URL'] ?? 'https://app.syndicsage.com'

  // Verify charge belongs to this building and is pending
  const { data: charge } = await supabase
    .from('charges')
    .select('id, amount, title, status, building_id')
    .eq('id', parsed.data.charge_id)
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .single()

  if (!charge) throw Errors.notFound('Charge')
  if ((charge as { status: string }).status === 'paid') throw Errors.badRequest('Charge is already paid')

  const amount = (charge as { amount: number }).amount

  let providerPaymentId: string | null = null
  let checkoutUrl: string

  if (MOLLIE_KEY) {
    // Create Mollie payment
    const mollieRes = await fetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${MOLLIE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount:      { currency: 'EUR', value: amount.toFixed(2) },
        description: (charge as { title: string }).title,
        redirectUrl: `${APP_URL}/portal?payment=done`,
        webhookUrl:  `${APP_URL}/api/v1/payments/webhook`,
        method:      ['bancontact', 'ideal', 'creditcard'],
        metadata:    { charge_id: parsed.data.charge_id, user_id: userId },
      }),
    })

    if (!mollieRes.ok) {
      console.error('[payments] Mollie error:', await mollieRes.text())
      throw Errors.internal()
    }

    const molliePayment = await mollieRes.json() as { id: string; _links: { checkout: { href: string } } }
    providerPaymentId = molliePayment.id
    checkoutUrl = molliePayment._links.checkout.href
  } else {
    // Dev fallback — no Mollie key configured
    providerPaymentId = `dev-${Date.now()}`
    checkoutUrl = `${APP_URL}/portal?payment=dev-simulation&charge_id=${parsed.data.charge_id}`
    console.log('[payments] MOLLIE_API_KEY not set — returning dev simulation URL')
  }

  const { data: txn, error } = await supabase
    .from('payment_transactions')
    .insert({
      charge_id:           parsed.data.charge_id,
      building_id:         buildingId,
      organization_id:     member.organization_id,
      user_id:             userId,
      provider:            'mollie',
      provider_payment_id: providerPaymentId,
      checkout_url:        checkoutUrl,
      status:              'open',
      amount,
    })
    .select()
    .single()

  if (error || !txn) throw Errors.internal()

  await logAudit({
    actor_id: userId, action: 'payment.initiated', resource_type: 'payment_transaction',
    resource_id: (txn as { id: string }).id, building_id: buildingId, organization_id: member.organization_id,
    metadata: { charge_id: parsed.data.charge_id, amount },
  })

  return c.json({ id: (txn as { id: string }).id, checkout_url: checkoutUrl }, 201)
})

// ── GET /:id — payment status ─────────────────────────────────

router.get('/:id', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const id         = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()

  const supabase = getSupabaseAdmin()
  const { data: txn } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('id', id)
    .eq('building_id', buildingId)
    .single()

  if (!txn) throw Errors.notFound('Payment')
  return c.json(txn)
})

// ── POST /webhook — Mollie callback ──────────────────────────
// This route is registered BEFORE the auth middleware in index.ts.

export async function handleMollieWebhook(body: Record<string, string>) {
  const id = body['id']
  // Mollie payment IDs always start with "tr_" followed by alphanumerics.
  // Reject anything else before touching the DB or calling the Mollie API.
  if (!id || !/^tr_[A-Za-z0-9]+$/.test(id)) return

  const MOLLIE_KEY = process.env['MOLLIE_API_KEY']
  if (!MOLLIE_KEY) return

  // Fetch payment status from Mollie
  const res = await fetch(`https://api.mollie.com/v2/payments/${id}`, {
    headers: { Authorization: `Bearer ${MOLLIE_KEY}` },
  })
  if (!res.ok) return

  const payment = await res.json() as { id: string; status: string; metadata?: { charge_id?: string; user_id?: string } }
  const supabase = getSupabaseAdmin()

  // Update our payment_transactions row
  const { data: txn } = await supabase
    .from('payment_transactions')
    .select('id, charge_id, building_id, organization_id')
    .eq('provider_payment_id', id)
    .single()

  if (!txn) return

  await supabase
    .from('payment_transactions')
    .update({ status: payment.status, updated_at: new Date().toISOString() })
    .eq('id', (txn as { id: string }).id)

  // If paid: mark charge as paid
  if (payment.status === 'paid') {
    await supabase
      .from('charges')
      .update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10) })
      .eq('id', (txn as { charge_id: string }).charge_id)

    await logAudit({
      actor_id:       payment.metadata?.user_id ?? (txn as { id: string }).id,
      action:         'payment.confirmed',
      resource_type:  'payment_transaction',
      resource_id:    (txn as { id: string }).id,
      building_id:    (txn as { building_id: string }).building_id,
      organization_id:(txn as { organization_id: string }).organization_id,
    })
  }
}

router.post('/webhook', async (c) => {
  const body = await c.req.parseBody().catch(() => ({})) as Record<string, string>
  await handleMollieWebhook(body).catch(err => console.error('[payments/webhook]', err))
  return c.text('', 200)
})

export { router as paymentsRouter }
