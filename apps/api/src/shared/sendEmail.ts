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
