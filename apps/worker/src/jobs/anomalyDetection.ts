// ── Anomaly Detection Job ─────────────────────────────────────
// Runs hourly via BullMQ repeat.
// Queries audit_log for three threat patterns and alerts on hits.
//
// Checks:
//   1. Brute-force / privilege probing — >10 access_denied from one actor in 10 min
//   2. Mass exfiltration attempt     — >50 document_download by one user in 1 hour
//   3. Impossible travel             — login country differs from all of last 5 logins
//
// On detection: sends alert email to hello@syndicsage.com
//               + inserts a security_alert entry into audit_log

import { createClient } from '@supabase/supabase-js'

const ALERT_EMAIL = 'hello@syndicsage.com'

function getSupabaseAdmin() {
  const url = process.env['SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false } })
}

interface AnomalyAlert {
  type:     'brute_force' | 'mass_download' | 'impossible_travel'
  actor_id: string
  detail:   string
}

export async function handleAnomalyDetection(_payload: Record<string, unknown>): Promise<void> {
  const supabase = getSupabaseAdmin()
  const alerts: AnomalyAlert[] = []

  const now        = new Date()
  const tenMinAgo  = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

  // ── Check 1: Brute force / privilege probing ──────────────────
  // >10 access_denied events from one actor in the last 10 minutes
  const { data: bruteForceCandidates } = await supabase
    .from('audit_log')
    .select('actor_id')
    .eq('action', 'access_denied')
    .gte('created_at', tenMinAgo)

  if (bruteForceCandidates && bruteForceCandidates.length > 0) {
    const counts = new Map<string, number>()
    for (const row of bruteForceCandidates) {
      counts.set(row.actor_id, (counts.get(row.actor_id) ?? 0) + 1)
    }
    for (const [actor_id, count] of counts) {
      if (count > 10) {
        alerts.push({
          type:     'brute_force',
          actor_id,
          detail:   `${count} access_denied events in the last 10 minutes`,
        })
      }
    }
  }

  // ── Check 2: Mass document exfiltration ───────────────────────
  // >50 document_download by one user in the last hour
  const { data: downloadCandidates } = await supabase
    .from('audit_log')
    .select('actor_id')
    .eq('action', 'document_download')
    .gte('created_at', oneHourAgo)

  if (downloadCandidates && downloadCandidates.length > 0) {
    const counts = new Map<string, number>()
    for (const row of downloadCandidates) {
      counts.set(row.actor_id, (counts.get(row.actor_id) ?? 0) + 1)
    }
    for (const [actor_id, count] of counts) {
      if (count > 50) {
        alerts.push({
          type:     'mass_download',
          actor_id,
          detail:   `${count} document downloads in the last hour`,
        })
      }
    }
  }

  // ── Check 3: Impossible travel ────────────────────────────────
  // Login country differs from ALL of the last 5 logins for that user.
  // Requires login handlers to write metadata.country_code on login_success events.
  const { data: recentLogins } = await supabase
    .from('audit_log')
    .select('actor_id, metadata, created_at')
    .eq('action', 'login_success')
    .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })

  if (recentLogins && recentLogins.length > 0) {
    // Group last 6 logins per actor (5 baseline + 1 latest to compare)
    const byActor = new Map<string, Array<{ country_code: string | null; created_at: string }>>()
    for (const row of recentLogins) {
      const country = (row.metadata as Record<string, unknown> | null)?.['country_code'] as string | undefined
      const list = byActor.get(row.actor_id) ?? []
      if (list.length < 6) {
        list.push({ country_code: country ?? null, created_at: row.created_at })
        byActor.set(row.actor_id, list)
      }
    }

    for (const [actor_id, logins] of byActor) {
      if (logins.length < 2) continue

      const [latest, ...baseline] = logins
      // Skip if country data is absent
      if (!latest?.country_code) continue

      const baselineCountries = new Set(baseline.map(l => l.country_code).filter(Boolean))
      if (baselineCountries.size > 0 && !baselineCountries.has(latest.country_code)) {
        alerts.push({
          type:     'impossible_travel',
          actor_id,
          detail:   `Login from ${latest.country_code} — baseline countries: ${[...baselineCountries].join(', ')}`,
        })
      }
    }
  }

  if (alerts.length === 0) return

  // ── Fire alerts ───────────────────────────────────────────────
  for (const alert of alerts) {
    // 1. Log to audit_log as security_alert (immutable record)
    await supabase.from('audit_log').insert({
      actor_id:      alert.actor_id,
      action:        'security_alert',
      resource_type: 'security',
      metadata:      { alert_type: alert.type, detail: alert.detail },
    })

    // 2. Send alert email (Resend wired in Phase 8 — log to console until then)
    const subject = `[SyndicSage] Security alert: ${alert.type}`
    const body    = `Actor: ${alert.actor_id}\nType: ${alert.type}\nDetail: ${alert.detail}\nTime: ${now.toISOString()}`

    if (process.env['RESEND_API_KEY']) {
      await sendAlertEmail(subject, body)
    } else {
      console.warn(`[anomaly] ALERT — ${subject}\n${body}`)
    }
  }

  console.log(`[anomaly] Run complete — ${alerts.length} alert(s) fired`)
}

async function sendAlertEmail(subject: string, body: string): Promise<void> {
  const apiKey = process.env['RESEND_API_KEY']
  if (!apiKey) return

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    'alerts@syndicsage.com',
        to:      [ALERT_EMAIL],
        subject,
        text:    body,
      }),
    })
    if (!res.ok) {
      console.error('[anomaly] Resend error:', await res.text())
    }
  } catch (err) {
    console.error('[anomaly] Failed to send alert email:', (err as Error).message)
  }
}
