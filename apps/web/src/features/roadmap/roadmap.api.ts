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

