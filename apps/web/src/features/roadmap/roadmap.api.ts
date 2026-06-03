// ── Roadmap client API ──────────────────────────────────────────

import { apiFetch }  from '../../lib/api'

export interface RoadmapItem {
  id:              string
  building_id:     string
  organization_id: string
  title:           string
  description:     string | null
  status:          'planned' | 'in_progress' | 'done'
  priority:        'low' | 'medium' | 'high'
  estimated_cost:  number | null
  target_date:     string | null
  created_at:      string
  updated_at:      string
  deleted_at:      string | null
}

export async function fetchRoadmap(buildingId: string): Promise<RoadmapItem[]> {
  if (buildingId.startsWith('mock-')) {
    return MOCK_ROADMAP[buildingId] ?? []
  }
  return apiFetch<RoadmapItem[]>(`/api/v1/roadmap?building_id=${buildingId}`, '')
}

export interface RoadmapItemBody {
  title:          string
  description?:   string
  status:         'planned' | 'in_progress' | 'done'
  priority:       'low' | 'medium' | 'high'
  estimated_cost?: number
  target_date?:   string
}

export async function apiCreateRoadmapItem(
  token: string, buildingId: string, body: RoadmapItemBody,
): Promise<RoadmapItem> {
  return apiFetch<RoadmapItem>(`/api/v1/roadmap?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiUpdateRoadmapItem(
  token: string, buildingId: string, id: string, body: Partial<RoadmapItemBody>,
): Promise<RoadmapItem> {
  return apiFetch<RoadmapItem>(`/api/v1/roadmap/${id}?building_id=${buildingId}`, token, {
    method: 'PATCH', body: JSON.stringify(body),
  })
}

export async function apiDeleteRoadmapItem(
  token: string, buildingId: string, id: string,
): Promise<void> {
  await apiFetch<void>(`/api/v1/roadmap/${id}?building_id=${buildingId}`, token, {
    method: 'DELETE',
  })
}

// ── Mock data ────────────────────────────────────────────────────
const MOCK_ROADMAP: Record<string, RoadmapItem[]> = {
  'mock-building-1': [
    {
      id: 'rm-1', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'Roof renovation', description: 'Full roof inspection and repair of damaged sections.',
      status: 'planned', priority: 'high', estimated_cost: 28000, target_date: '2026-09-01',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null,
    },
    {
      id: 'rm-2', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'Elevator modernisation', description: 'Upgrade control panel and cabin lining.',
      status: 'in_progress', priority: 'high', estimated_cost: 45000, target_date: '2026-07-01',
      created_at: '2026-01-15T00:00:00Z', updated_at: '2026-03-01T00:00:00Z', deleted_at: null,
    },
    {
      id: 'rm-3', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'Repaint common areas', description: 'Stairwell and hallway repaint, 6 floors.',
      status: 'in_progress', priority: 'medium', estimated_cost: 8500, target_date: '2026-06-30',
      created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z', deleted_at: null,
    },
    {
      id: 'rm-4', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'Install intercom system', description: 'Replace old buzzer with video intercom.',
      status: 'planned', priority: 'medium', estimated_cost: 6200, target_date: '2026-10-01',
      created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z', deleted_at: null,
    },
    {
      id: 'rm-5', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'LED lighting upgrade', description: 'All common areas switched to LED.',
      status: 'done', priority: 'low', estimated_cost: 2400, target_date: '2026-03-15',
      created_at: '2026-01-10T00:00:00Z', updated_at: '2026-03-20T00:00:00Z', deleted_at: null,
    },
  ],
}
