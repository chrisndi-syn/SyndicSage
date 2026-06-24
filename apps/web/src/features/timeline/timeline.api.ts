// ── Building Timeline client API ───────────────────────────────

import { supabase }  from '../../lib/supabase'
import { apiFetch }  from '../../lib/api'

export interface AuditEntry {
  id:            string
  actor_id:      string
  action:        string
  resource_type: string
  resource_id:   string | null
  metadata:      Record<string, unknown> | null
  created_at:    string
}

export async function fetchTimeline(buildingId: string): Promise<AuditEntry[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  return apiFetch<AuditEntry[]>(
    `/api/v1/timeline?building_id=${buildingId}`,
    session.access_token,
  )
}

