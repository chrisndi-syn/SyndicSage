// ── Maintenance tasks client API ──────────────────────────────

import { apiFetch } from '../../lib/api'

export interface MaintenanceTask {
  id:                  string
  building_id:         string
  organization_id:     string
  title:               string
  description:         string | null
  category:            string
  priority:            'high' | 'medium' | 'low'
  frequency:           string
  next_due_date:       string | null
  last_done_date:      string | null
  remind_days_before:  number
  supplier_name:       string | null
  notes:               string | null
  created_at:          string
  updated_at:          string
}

export interface TaskBody {
  title:              string
  description?:       string | null
  category?:          string
  priority?:          'high' | 'medium' | 'low'
  frequency?:         string
  next_due_date?:     string | null
  remind_days_before?: number
  supplier_name?:     string | null
  notes?:             string | null
}

export const TASK_CATEGORIES = [
  'heating', 'gas', 'elevator', 'fire_safety', 'electrical',
  'cleaning', 'structural', 'pest_control', 'plumbing', 'other',
] as const

export const TASK_FREQUENCIES = [
  'monthly', 'quarterly', 'biannual', 'annual', 'biennial', 'as_needed',
] as const

export const TASK_TEMPLATES: Pick<TaskBody, 'title' | 'description' | 'category' | 'frequency' | 'priority'>[] = [
  { title: 'Boiler service',           description: 'Annual boiler inspection and servicing by certified technician',    category: 'heating',     frequency: 'annual',    priority: 'high'   },
  { title: 'Gas installation check',   description: 'Safety inspection of gas pipes and connections',                   category: 'gas',         frequency: 'annual',    priority: 'high'   },
  { title: 'Elevator inspection',      description: 'Mandatory annual elevator safety inspection (EDTC/AIB-Vinçotte)', category: 'elevator',    frequency: 'annual',    priority: 'high'   },
  { title: 'Fire extinguisher check',  description: 'Inspection and recharging of fire extinguishers',                  category: 'fire_safety', frequency: 'annual',    priority: 'high'   },
  { title: 'Smoke detector test',      description: 'Test and battery replacement for all smoke detectors',             category: 'fire_safety', frequency: 'annual',    priority: 'high'   },
  { title: 'Electrical panel check',   description: 'Inspection of common area electrical panels and earthing',         category: 'electrical',  frequency: 'biennial',  priority: 'medium' },
  { title: 'Common area cleaning',     description: 'Regular cleaning of entrance, stairs, and common areas',           category: 'cleaning',    frequency: 'monthly',   priority: 'medium' },
  { title: 'Gutter cleaning',          description: 'Clean roof gutters and downpipes to prevent water damage',         category: 'structural',  frequency: 'biannual',  priority: 'medium' },
  { title: 'Pest control',             description: 'Preventive treatment against rodents and insects',                 category: 'pest_control',frequency: 'annual',    priority: 'medium' },
  { title: 'Plumbing inspection',      description: 'Check common area pipes, stopcocks, and water meter',              category: 'plumbing',    frequency: 'annual',    priority: 'medium' },
]

export async function fetchMaintenanceTasks(buildingId: string): Promise<MaintenanceTask[]> {
  if (buildingId.startsWith('mock-')) return MOCK_TASKS[buildingId] ?? []
  return apiFetch<MaintenanceTask[]>(`/api/v1/maintenance?building_id=${buildingId}`, '')
}

export async function apiCreateTask(token: string, buildingId: string, body: TaskBody): Promise<MaintenanceTask> {
  return apiFetch<MaintenanceTask>(`/api/v1/maintenance?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiUpdateTask(token: string, buildingId: string, id: string, body: Partial<TaskBody>): Promise<MaintenanceTask> {
  return apiFetch<MaintenanceTask>(`/api/v1/maintenance/${id}?building_id=${buildingId}`, token, {
    method: 'PATCH', body: JSON.stringify(body),
  })
}

export async function apiMarkDone(token: string, buildingId: string, id: string): Promise<{ ok: boolean; next_due_date: string }> {
  return apiFetch(`/api/v1/maintenance/${id}/done?building_id=${buildingId}`, token, { method: 'POST' })
}

export async function apiDeleteTask(token: string, buildingId: string, id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/maintenance/${id}?building_id=${buildingId}`, token, { method: 'DELETE' })
}

// ── Mock data ─────────────────────────────────────────────────

const today = new Date()
const dt = (daysOffset: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().slice(0, 10)
}

const MOCK_TASKS: Record<string, MaintenanceTask[]> = {
  'mock-building-1': [
    {
      id: 'mt-1', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'Elevator inspection', description: 'Mandatory annual safety inspection (AIB-Vinçotte)',
      category: 'elevator', priority: 'high', frequency: 'annual',
      next_due_date: dt(-5), last_done_date: dt(-370),
      remind_days_before: 30, supplier_name: 'Otis Belgium',
      notes: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mt-2', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'Fire extinguisher check', description: 'Inspection and recharging of all fire extinguishers in common areas',
      category: 'fire_safety', priority: 'high', frequency: 'annual',
      next_due_date: dt(8), last_done_date: dt(-357),
      remind_days_before: 14, supplier_name: 'Sicli Belgium',
      notes: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mt-3', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'Common area cleaning', description: 'Weekly cleaning: stairwells, lobby, bike room, rubbish area',
      category: 'cleaning', priority: 'medium', frequency: 'monthly',
      next_due_date: dt(3), last_done_date: dt(-28),
      remind_days_before: 3, supplier_name: 'CleanPro SPRL',
      notes: null, created_at: '2026-01-05T00:00:00Z', updated_at: '2026-01-05T00:00:00Z',
    },
    {
      id: 'mt-4', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'Boiler service', description: 'Annual boiler inspection and servicing by certified technician',
      category: 'heating', priority: 'high', frequency: 'annual',
      next_due_date: dt(45), last_done_date: dt(-320),
      remind_days_before: 21, supplier_name: 'Dalkia Belgium',
      notes: 'Contact Dalkia 3 weeks before to book appointment.', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mt-5', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'Gutter cleaning', description: 'Clean roof gutters and downpipes — spring and autumn',
      category: 'structural', priority: 'medium', frequency: 'biannual',
      next_due_date: dt(62), last_done_date: dt(-120),
      remind_days_before: 14, supplier_name: null,
      notes: null, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z',
    },
    {
      id: 'mt-6', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'Electrical panel check', description: 'Inspection of common area electrical panels, fuses, and earthing',
      category: 'electrical', priority: 'medium', frequency: 'biennial',
      next_due_date: dt(180), last_done_date: dt(-550),
      remind_days_before: 30, supplier_name: 'Electro Dubois',
      notes: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  'mock-building-2': [
    {
      id: 'mt-b2-1', building_id: 'mock-building-2', organization_id: 'mock-org-1',
      title: 'Common area cleaning', description: 'Bi-weekly cleaning of entrance and stairwells',
      category: 'cleaning', priority: 'medium', frequency: 'monthly',
      next_due_date: dt(5), last_done_date: dt(-14),
      remind_days_before: 3, supplier_name: 'CleanPro SPRL',
      notes: null, created_at: '2026-01-05T00:00:00Z', updated_at: '2026-01-05T00:00:00Z',
    },
    {
      id: 'mt-b2-2', building_id: 'mock-building-2', organization_id: 'mock-org-1',
      title: 'Boiler service', description: 'Annual boiler inspection',
      category: 'heating', priority: 'high', frequency: 'annual',
      next_due_date: dt(-10), last_done_date: dt(-375),
      remind_days_before: 21, supplier_name: null,
      notes: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
  ],
}
