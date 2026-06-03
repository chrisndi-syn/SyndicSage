// ── Billing routes (Stripe) ───────────────────────────────────
// POST /api/v1/billing/checkout — create Stripe Checkout session → returns {url}
// GET  /api/v1/billing/status   — return current plan + subscription status
// GET  /api/v1/billing/customers (admin only) — list all orgs with billing info

// Webhook (registered outside auth middleware in index.ts):
// POST /api/v1/billing/webhook  — Stripe event handler

import { Hono } from 'hono'
import Stripe   from 'stripe'
import { z }    from 'zod'
import { Resend }           from 'resend'
import { Errors }           from '../../shared/errors.js'
import { logAudit }         from '../../shared/logAudit.js'
import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { getOrgForUser }    from '../buildings/buildings.api.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string } | undefined
}

// ── Stripe client (lazy — safe if key not set in dev) ─────────
function getStripe(): Stripe | null {
  const key = process.env['STRIPE_SECRET_KEY']
  if (!key) return null
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' })
}

const STARTER_PRICE_ID = process.env['STRIPE_STARTER_PRICE_ID'] ?? ''
const PRO_PRICE_ID     = process.env['STRIPE_PRO_PRICE_ID']     ?? ''
const APP_URL          = process.env['APP_URL']                  ?? 'http://localhost:5173'
const ADMIN_USER_ID    = process.env['ADMIN_USER_ID']            ?? ''

// ── Plan name derived from Stripe price id ────────────────────
function planFromPriceId(priceId: string): 'starter' | 'pro' {
  if (priceId === PRO_PRICE_ID) return 'pro'
  return 'starter'
}

// ── Protected router ──────────────────────────────────────────
const router = new Hono<{ Variables: Variables }>()

// ── POST /billing/checkout ────────────────────────────────────
const CheckoutSchema = z.object({
  plan: z.enum(['starter', 'pro']),
})

router.post('/checkout', async (c) => {
  const userId = c.get('userId')
  const body   = await c.req.json()
  const parsed = CheckoutSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest('plan must be starter or pro')

  const { plan } = parsed.data
  const org       = await getOrgForUser(userId)
  const supabase  = getSupabaseAdmin()

  // Load profile for customer email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single()

  if (!profile) throw Errors.notFound('Profile')

  const stripe = getStripe()

  // Dev fallback — no Stripe key: redirect straight to success
  if (!stripe || !STARTER_PRICE_ID) {
    await supabase
      .from('organizations')
      .update({ plan })
      .eq('id', org.id)
    await logAudit({ actor_id: userId, action: 'billing.checkout_created', resource_type: 'organization', resource_id: org.id })
    return c.json({ url: `${APP_URL}/subscribe/success?mock=1&plan=${plan}` })
  }

  const priceId = plan === 'pro' ? PRO_PRICE_ID : STARTER_PRICE_ID

  const session = await stripe.checkout.sessions.create({
    mode:           'subscription',
    customer_email: (profile as { email: string; full_name: string }).email,
    line_items:     [{ price: priceId, quantity: 1 }],
    success_url:    `${APP_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:     `${APP_URL}/subscribe`,
    metadata:       { organization_id: org.id, user_id: userId, plan },
    subscription_data: {
      metadata: { organization_id: org.id },
    },
  })

  await logAudit({ actor_id: userId, action: 'billing.checkout_created', resource_type: 'organization', resource_id: org.id })
  return c.json({ url: session.url })
})

// ── GET /billing/status ───────────────────────────────────────
router.get('/status', async (c) => {
  const userId  = c.get('userId')
  const org     = await getOrgForUser(userId)
  const supabase = getSupabaseAdmin()

  const { data } = await supabase
    .from('organizations')
    .select('plan, stripe_customer_id, stripe_subscription_id, trial_ends_at')
    .eq('id', org.id)
    .single()

  return c.json(data ?? { plan: 'free' })
})

// ── GET /billing/customers (admin only) ───────────────────────
router.get('/customers', async (c) => {
  const userId = c.get('userId')

  if (!ADMIN_USER_ID || userId !== ADMIN_USER_ID) throw Errors.forbidden()

  const supabase = getSupabaseAdmin()

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, plan, stripe_customer_id, stripe_subscription_id, created_at, vat_number')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (!orgs?.length) return c.json([])

  const orgIds = orgs.map((o: { id: string }) => o.id)

  // Count members per org (via profiles)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('organization_id')
    .in('organization_id', orgIds)

  const memberCounts = new Map<string, number>()
  for (const p of (profiles ?? []) as { organization_id: string }[]) {
    memberCounts.set(p.organization_id, (memberCounts.get(p.organization_id) ?? 0) + 1)
  }

  // Count buildings per org
  const { data: buildings } = await supabase
    .from('buildings')
    .select('organization_id')
    .in('organization_id', orgIds)
    .is('deleted_at', null)

  const buildingCounts = new Map<string, number>()
  for (const b of (buildings ?? []) as { organization_id: string }[]) {
    buildingCounts.set(b.organization_id, (buildingCounts.get(b.organization_id) ?? 0) + 1)
  }

  const rows = (orgs as {
    id: string; name: string; plan: string; stripe_customer_id: string | null;
    stripe_subscription_id: string | null; created_at: string; vat_number: string | null;
  }[]).map(o => ({
    ...o,
    member_count:   memberCounts.get(o.id) ?? 0,
    building_count: buildingCounts.get(o.id) ?? 0,
  }))

  return c.json(rows)
})

export { router as billingRouter }

// ── Stripe webhook handler (exported for index.ts) ────────────
// Registered outside auth middleware to receive raw body for signature check.
export async function handleStripeWebhook(req: Request): Promise<Response> {
  const stripe        = getStripe()
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET']
  const rawBody       = await req.text()
  const sig           = req.headers.get('stripe-signature') ?? ''

  if (!stripe || !webhookSecret) {
    // Dev: no Stripe configured — silently accept
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object as Stripe.Checkout.Session
    const orgId    = session.metadata?.organization_id
    const userId   = session.metadata?.user_id
    const planMeta = session.metadata?.plan as string | undefined

    if (!orgId) return new Response(JSON.stringify({ received: true }), { status: 200 })

    const plan = planMeta === 'pro' ? 'pro' : (
      session.line_items
        ? planFromPriceId((session as unknown as { line_items?: { data?: { price?: { id?: string } }[] } }).line_items?.data?.[0]?.price?.id ?? '')
        : 'starter'
    )

    const supabase = getSupabaseAdmin()
    await supabase
      .from('organizations')
      .update({
        plan,
        stripe_customer_id:     session.customer as string | null,
        stripe_subscription_id: session.subscription as string | null,
      })
      .eq('id', orgId)

    if (userId) {
      await logAudit({ actor_id: userId, action: 'billing.subscription_activated', resource_type: 'organization', resource_id: orgId })
    }

    // Load org + user details for notification email
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    const adminEmail  = process.env['ADMIN_NOTIFICATION_EMAIL']
    const resendKey   = process.env['RESEND_API_KEY']
    const resendFrom  = process.env['RESEND_FROM'] ?? 'SyndicSage <no-reply@syndicsage.com>'
    if (adminEmail && orgRow && resendKey) {
      const { data: profile } = userId ? await supabase.from('profiles').select('full_name, email').eq('id', userId).single() : { data: null }
      const resend = new Resend(resendKey)
      const orgName = (orgRow as { name: string }).name
      await resend.emails.send({
        from:    resendFrom,
        to:      [adminEmail],
        subject: `New SyndicSage customer: ${orgName}`,
        html:    `
          <p><strong>New paying customer on SyndicSage</strong></p>
          <ul>
            <li><strong>Org:</strong> ${orgName}</li>
            ${profile ? `<li><strong>User:</strong> ${(profile as { full_name: string }).full_name} (${(profile as { email: string }).email})</li>` : ''}
            <li><strong>Plan:</strong> ${plan}</li>
            <li><strong>Time:</strong> ${new Date().toISOString()}</li>
          </ul>
        `,
      })
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
}
