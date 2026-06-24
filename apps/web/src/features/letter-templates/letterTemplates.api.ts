// ── Letter Templates client API ────────────────────────────────

import { supabase }              from '../../lib/supabase'
import { apiFetch }              from '../../lib/api'

export interface LetterTemplate {
  id:              string
  organization_id: string
  building_id:     string | null
  name:            string
  category:        string
  body_html:       string
  variables:       string[]
  is_default:      boolean
  created_at:      string
  updated_at:      string
}

export async function fetchLetterTemplates(organizationId: string, buildingId?: string): Promise<LetterTemplate[]> {
  let query = supabase
    .from('letter_templates')
    .select('*')
    .eq('organization_id', organizationId)

  if (buildingId) {
    query = query.or(`building_id.is.null,building_id.eq.${buildingId}`)
  }

  const { data, error } = await query.order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as LetterTemplate[]
}

export interface CreateTemplateBody {
  name:        string
  category:    string
  body_html:   string
  variables:   string[]
  building_id?: string | null
}

export async function apiCreateTemplate(
  token: string, organizationId: string, body: CreateTemplateBody,
): Promise<LetterTemplate> {
  return apiFetch<LetterTemplate>(`/api/v1/letter-templates?organization_id=${organizationId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiUpdateTemplate(
  token: string, organizationId: string, id: string, body: Partial<CreateTemplateBody>,
): Promise<LetterTemplate> {
  return apiFetch<LetterTemplate>(`/api/v1/letter-templates/${id}?organization_id=${organizationId}`, token, {
    method: 'PATCH', body: JSON.stringify(body),
  })
}

export async function apiDeleteTemplate(
  token: string, organizationId: string, id: string,
): Promise<void> {
  return apiFetch<void>(`/api/v1/letter-templates/${id}?organization_id=${organizationId}`, token, {
    method: 'DELETE',
  })
}

export interface RenderTemplateResult {
  html: string
}

export async function apiRenderTemplate(
  token: string, templateId: string, buildingId: string, variables: Record<string, string>,
): Promise<RenderTemplateResult> {
  return apiFetch<RenderTemplateResult>(
    `/api/v1/letter-templates/${templateId}/render?building_id=${buildingId}`,
    token,
    { method: 'POST', body: JSON.stringify({ variables }) },
  )
}
