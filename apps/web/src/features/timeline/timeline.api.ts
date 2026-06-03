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
  if (buildingId.startsWith('mock-')) return MOCK_TIMELINE

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return MOCK_TIMELINE

  return apiFetch<AuditEntry[]>(
    `/api/v1/timeline?building_id=${buildingId}`,
    session.access_token,
  )
}

// ── Mock data ─────────────────────────────────────────────────
const now = Date.now()
export const MOCK_TIMELINE: AuditEntry[] = [
  {
    id: 'mock-audit-1', actor_id: 'mock-user-1',
    action: 'charge.created', resource_type: 'charge', resource_id: 'mock-charge-1',
    metadata: { name: 'Q2 Common Area Charge' }, created_at: new Date(now - 1 * 3600000).toISOString(),
  },
  {
    id: 'mock-audit-2', actor_id: 'mock-user-1',
    action: 'document.uploaded', resource_type: 'document', resource_id: 'mock-doc-1',
    metadata: { name: 'AG Minutes — May 2026' }, created_at: new Date(now - 26 * 3600000).toISOString(),
  },
  {
    id: 'mock-audit-3', actor_id: 'mock-user-1',
    action: 'owner.created', resource_type: 'owner', resource_id: 'mock-owner-1',
    metadata: { name: 'Maria Dupont' }, created_at: new Date(now - 3 * 86400000).toISOString(),
  },
  {
    id: 'mock-audit-4', actor_id: 'mock-user-1',
    action: 'charge.paid', resource_type: 'charge', resource_id: 'mock-charge-2',
    metadata: { name: 'Q1 Common Area Charge' }, created_at: new Date(now - 5 * 86400000).toISOString(),
  },
  {
    id: 'mock-audit-5', actor_id: 'mock-user-1',
    action: 'building.updated', resource_type: 'building', resource_id: 'mock-building-1',
    metadata: null, created_at: new Date(now - 7 * 86400000).toISOString(),
  },
  {
    id: 'mock-audit-6', actor_id: 'mock-user-1',
    action: 'ticket.closed', resource_type: 'ticket', resource_id: 'mock-ticket-1',
    metadata: { title: 'Basement leak' }, created_at: new Date(now - 10 * 86400000).toISOString(),
  },
]
