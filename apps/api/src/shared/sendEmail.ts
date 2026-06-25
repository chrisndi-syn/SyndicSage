// ── Email helper — Resend ──────────────────────────────────────
// S6: All values interpolated into HTML must be escaped.

import { Resend } from 'resend'

const resend = new Resend(process.env['RESEND_API_KEY'] ?? '')
const FROM    = process.env['RESEND_FROM'] ?? 'SyndicSage <no-reply@syndicsage.com>'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function sendInvitationEmail(opts: {
  to:           string
  buildingName: string
  role:         string
  inviteUrl:    string
}) {
  const { to, buildingName, role, inviteUrl } = opts

  const roleLabel = role === 'co_owner' ? 'co-owner' : role === 'renter' ? 'renter' : role
  const html = `
<p>You have been invited to join <strong>${esc(buildingName)}</strong> on SyndicSage as a ${esc(roleLabel)}.</p>
<p><a href="${esc(inviteUrl)}" style="padding:10px 18px;background:#1E3A5F;color:#fff;border-radius:6px;text-decoration:none;display:inline-block">Accept invitation</a></p>
<p style="color:#999;font-size:12px">This link expires in 7 days.</p>
`

  if (!process.env['RESEND_API_KEY']) {
    console.log('[sendEmail] RESEND_API_KEY not set — logging email instead')
    console.log(`To: ${to}\nSubject: You're invited to ${buildingName}\n${inviteUrl}`)
    return
  }

  await resend.emails.send({
    from:    FROM,
    to:      [to],
    subject: `You're invited to join ${buildingName} on SyndicSage`,
    html,
  })
}

export async function sendChargeReminderEmail(opts: {
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

  const subject = isOverdue
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

  if (!process.env['RESEND_API_KEY']) {
    console.log(`[sendEmail] charge reminder to ${to}: ${chargeTitle} €${amount}`)
    return
  }

  await resend.emails.send({ from: FROM, to: [to], subject, html })
}

export async function sendMessageNotificationEmail(opts: {
  to:           string
  buildingName: string
  senderName:   string
  subject:      string
  appUrl:       string
}) {
  const { to, buildingName, senderName, subject, appUrl } = opts
  const html = `
<p>You have a new message from <strong>${esc(senderName)}</strong> in <strong>${esc(buildingName)}</strong>.</p>
<p>Subject: <strong>${esc(subject)}</strong></p>
<p><a href="${esc(appUrl)}" style="padding:10px 18px;background:#1E3A5F;color:#fff;border-radius:6px;text-decoration:none;display:inline-block">View message</a></p>
`

  if (!process.env['RESEND_API_KEY']) {
    console.log(`[sendEmail] message notification to ${to}: ${subject}`)
    return
  }

  await resend.emails.send({
    from:    FROM,
    to:      [to],
    subject: `New message from ${senderName} — ${buildingName}`,
    html,
  })
}
