// ── Charge reminders — daily job ──────────────────────────────
// Runs once per day (scheduled in index.ts at 08:00).
// For each building with auto_remind_enabled = true:
//   - Sends a reminder for pending charges due within auto_remind_days days
//   - Sends a weekly reminder for overdue charges
// Dedup: charge_reminder_log UNIQUE(charge_id, sent_date) prevents duplicates.

import { createClient } from '@supabase/supabase-js'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function getSupabase() {
  const url = process.env['SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !key) throw new Error('[chargeReminders] Missing Supabase env vars')
  return createClient(url, key, { auth: { persistSession: false } })
}

async function sendReminderEmail(opts: {
  to:          string
  ownerName:   string
  buildingName: string
  chargeTitle: string
  amount:      number
  dueDate:     string
  isOverdue:   boolean
  portalUrl:   string
}) {
  const { to, ownerName, buildingName, chargeTitle, amount, dueDate, isOverdue, portalUrl } = opts

  const RESEND_API_KEY = process.env['RESEND_API_KEY']
  const FROM           = process.env['RESEND_FROM'] ?? 'SyndicSage <no-reply@syndicsage.com>'

  const subject     = isOverdue
    ? `[SyndicSage] Overdue charge — ${buildingName}`
    : `[SyndicSage] Charge reminder — ${buildingName}`
  const headerColor = isOverdue ? '#DC2626' : '#1E3A5F'
  const headerText  = isOverdue ? 'Overdue payment' : 'Payment reminder'
  const bodyText    = isOverdue
    ? `Your charge of <strong>€${esc(String(amount))}</strong> was due on ${esc(dueDate)} and is now overdue.`
    : `Your charge of <strong>€${esc(String(amount))}</strong> is due on ${esc(dueDate)}.`

  const html = `
<div style="font-family:sans-serif;max-width:540px;margin:0 auto">
  <div style="background:${headerColor};color:#fff;padding:20px 24px;border-radius:8px 8px 0 0">
    <strong style="font-size:16px">${headerText}</strong>
  </div>
  <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p>Hello ${esc(ownerName)},</p>
    <p>${bodyText}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="color:#6B7280;padding:8px 0;border-bottom:1px solid #F3F4F6">Building</td><td style="padding:8px 0;border-bottom:1px solid #F3F4F6;text-align:right"><strong>${esc(buildingName)}</strong></td></tr>
      <tr><td style="color:#6B7280;padding:8px 0;border-bottom:1px solid #F3F4F6">Charge</td><td style="padding:8px 0;border-bottom:1px solid #F3F4F6;text-align:right">${esc(chargeTitle)}</td></tr>
      <tr><td style="color:#6B7280;padding:8px 0">Amount due</td><td style="padding:8px 0;text-align:right;font-size:18px;font-weight:700;color:${headerColor}">€${esc(String(amount))}</td></tr>
    </table>
    <a href="${esc(portalUrl)}" style="display:inline-block;padding:12px 24px;background:${headerColor};color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Pay now</a>
    <p style="color:#9CA3AF;font-size:12px;margin-top:20px">You are receiving this email because you are a co-owner of ${esc(buildingName)} managed on SyndicSage.</p>
  </div>
</div>
`

  if (!RESEND_API_KEY) {
    console.log(`[chargeReminders] RESEND_API_KEY not set — logging: to=${to} subject="${subject}"`)
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ from: FROM, to: [to], subject, html }),
  })

  if (!res.ok) {
    console.error('[chargeReminders] Resend error:', await res.text())
  }
}

export async function handleChargeReminders(_payload: Record<string, unknown>) {
  const supabase  = getSupabase()
  const APP_URL   = process.env['APP_URL'] ?? 'https://app.syndicsage.com'
  const today     = new Date().toISOString().slice(0, 10)   // YYYY-MM-DD

  // 1. Find all buildings with auto-remind enabled
  const { data: buildings, error: bErr } = await supabase
    .from('buildings')
    .select('id, name, auto_remind_days')
    .eq('auto_remind_enabled', true)
    .is('deleted_at', null)

  if (bErr) { console.error('[chargeReminders] buildings query failed:', bErr.message); return }
  if (!buildings || buildings.length === 0) return

  let sent = 0
  let skipped = 0

  for (const building of buildings as { id: string; name: string; auto_remind_days: number }[]) {
    const remindDays = building.auto_remind_days ?? 7

    // 2. Find pending/overdue charges with an owner assigned
    const { data: charges } = await supabase
      .from('charges')
      .select('id, title, amount, status, due_date, owner_id')
      .eq('building_id', building.id)
      .in('status', ['pending', 'overdue'])
      .not('owner_id', 'is', null)
      .is('deleted_at', null)

    if (!charges || charges.length === 0) continue

    for (const charge of charges as { id: string; title: string; amount: number; status: string; due_date: string; owner_id: string }[]) {
      const dueDate    = new Date(charge.due_date)
      const todayDate  = new Date(today)
      const daysUntilDue = Math.round((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))

      // Pending: remind only when within remindDays of due date
      // Overdue: remind, but throttle to once every 7 days
      const shouldRemind = charge.status === 'overdue'
        || (charge.status === 'pending' && daysUntilDue <= remindDays && daysUntilDue >= 0)

      if (!shouldRemind) { skipped++; continue }

      // Throttle overdue reminders to once per 7 days
      if (charge.status === 'overdue') {
        const { data: recent } = await supabase
          .from('charge_reminder_log')
          .select('sent_date')
          .eq('charge_id', charge.id)
          .order('sent_date', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (recent) {
          const lastSent  = new Date((recent as { sent_date: string }).sent_date)
          const daysSince = Math.round((todayDate.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24))
          if (daysSince < 7) { skipped++; continue }
        }
      }

      // 3. Look up owner email
      const { data: owner } = await supabase
        .from('owners')
        .select('full_name, email, has_no_email')
        .eq('id', charge.owner_id)
        .single()

      const ownerRow = owner as { full_name: string; email: string; has_no_email?: boolean } | null
      if (!ownerRow || ownerRow.has_no_email || !ownerRow.email) { skipped++; continue }

      // 4. Dedup: skip if already sent today (pending same-day check)
      const { data: alreadySent } = await supabase
        .from('charge_reminder_log')
        .select('id')
        .eq('charge_id', charge.id)
        .eq('sent_date', today)
        .maybeSingle()

      if (alreadySent) { skipped++; continue }

      // 5. Send email
      try {
        await sendReminderEmail({
          to:           ownerRow.email,
          ownerName:    ownerRow.full_name,
          buildingName: building.name,
          chargeTitle:  charge.title,
          amount:       charge.amount,
          dueDate:      charge.due_date,
          isOverdue:    charge.status === 'overdue',
          portalUrl:    `${APP_URL}/portal/charges`,
        })

        // 6. Log the send
        await supabase.from('charge_reminder_log').insert({
          charge_id:   charge.id,
          building_id: building.id,
          owner_email: ownerRow.email,
          sent_date:   today,
        })

        sent++
        console.log(`[chargeReminders] ✓ sent to ${ownerRow.email} — charge ${charge.id}`)
      } catch (err) {
        console.error(`[chargeReminders] ✗ failed for charge ${charge.id}:`, (err as Error).message)
      }
    }
  }

  console.log(`[chargeReminders] done — sent: ${sent}, skipped: ${skipped}`)
}
