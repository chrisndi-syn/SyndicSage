// ── Shared audit logging helper ────────────────────────────────
// All feature modules call this to write immutable audit entries.
// Must use service role — client key cannot write to audit_log.

import { getSupabaseAdmin } from './supabaseAdmin.js'

interface AuditParams {
  actor_id:        string
  action:          string
  resource_type:   string
  resource_id?:    string
  building_id?:    string
  organization_id?: string
  metadata?:       Record<string, unknown>
}

export async function logAudit(params: AuditParams): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('audit_log').insert({
    actor_id:        params.actor_id,
    action:          params.action,
    resource_type:   params.resource_type,
    resource_id:     params.resource_id    ?? null,
    building_id:     params.building_id    ?? null,
    organization_id: params.organization_id ?? null,
    metadata:        params.metadata        ?? null,
  })

  if (error) {
    // Audit logging must never break the main flow — log and continue
    console.error('[audit] Failed to write audit log:', error.message)
  }
}
