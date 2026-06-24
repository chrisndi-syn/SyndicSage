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

export const TASK_TEMPLATES: (Pick<TaskBody, 'title' | 'description' | 'category' | 'frequency' | 'priority'> & { tplKey: string })[] = [
  { tplKey: 'tplBoiler',     title: 'Boiler service',           description: 'Annual boiler inspection and servicing by certified technician',    category: 'heating',     frequency: 'annual',    priority: 'high'   },
  { tplKey: 'tplGas',        title: 'Gas installation check',   description: 'Safety inspection of gas pipes and connections',                   category: 'gas',         frequency: 'annual',    priority: 'high'   },
  { tplKey: 'tplElevator',   title: 'Elevator inspection',      description: 'Mandatory annual elevator safety inspection (EDTC/AIB-Vinçotte)', category: 'elevator',    frequency: 'annual',    priority: 'high'   },
  { tplKey: 'tplFireExt',    title: 'Fire extinguisher check',  description: 'Inspection and recharging of fire extinguishers',                  category: 'fire_safety', frequency: 'annual',    priority: 'high'   },
  { tplKey: 'tplSmoke',      title: 'Smoke detector test',      description: 'Test and battery replacement for all smoke detectors',             category: 'fire_safety', frequency: 'annual',    priority: 'high'   },
  { tplKey: 'tplElectrical', title: 'Electrical panel check',   description: 'Inspection of common area electrical panels and earthing',         category: 'electrical',  frequency: 'biennial',  priority: 'medium' },
  { tplKey: 'tplCleaning',   title: 'Common area cleaning',     description: 'Regular cleaning of entrance, stairs, and common areas',           category: 'cleaning',    frequency: 'monthly',   priority: 'medium' },
  { tplKey: 'tplGutter',     title: 'Gutter cleaning',          description: 'Clean roof gutters and downpipes to prevent water damage',         category: 'structural',  frequency: 'biannual',  priority: 'medium' },
  { tplKey: 'tplPest',       title: 'Pest control',             description: 'Preventive treatment against rodents and insects',                 category: 'pest_control',frequency: 'annual',    priority: 'medium' },
  { tplKey: 'tplPlumbing',   title: 'Plumbing inspection',      description: 'Check common area pipes, stopcocks, and water meter',              category: 'plumbing',    frequency: 'annual',    priority: 'medium' },
]

export async function fetchMaintenanceTasks(buildingId: string): Promise<MaintenanceTask[]> {
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

