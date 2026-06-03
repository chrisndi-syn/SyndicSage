// ── Letter Templates repository layer ────────────────────────

import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { Errors }           from '../../shared/errors.js'

export interface LetterTemplateRow {
  id:              string
  organization_id: string
  building_id:     string | null   // NULL = org-wide
  name:            string
  category:        string
  body_html:       string
  variables:       string[]
  is_default:      boolean
  created_at:      string
  updated_at:      string
}

const VALID_CATEGORIES = ['financial','governance','maintenance','communication','legal'] as const
export type LetterTemplateCategory = typeof VALID_CATEGORIES[number]
export function isValidTemplateCategory(v: string): v is LetterTemplateCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(v)
}

export async function listLetterTemplates(
  organizationId: string,
  buildingId?: string,
): Promise<LetterTemplateRow[]> {
  const supabase = getSupabaseAdmin()
  // Return org-wide templates + building-specific templates (if buildingId provided)
  let query = supabase
    .from('letter_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (buildingId) {
    query = query.or(`building_id.is.null,building_id.eq.${buildingId}`)
  } else {
    query = query.is('building_id', null)
  }

  const { data, error } = await query
  if (error) throw Errors.internal()
  return (data ?? []) as LetterTemplateRow[]
}

export interface CreateLetterTemplateInput {
  organization_id: string
  building_id?:    string | null
  name:            string
  category:        LetterTemplateCategory
  body_html:       string
  variables?:      string[]
}

export async function createLetterTemplate(input: CreateLetterTemplateInput): Promise<LetterTemplateRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('letter_templates')
    .insert({ ...input, variables: input.variables ?? [] })
    .select()
    .single()

  if (error || !data) throw Errors.internal()
  return data as LetterTemplateRow
}

export interface UpdateLetterTemplateInput {
  name?:      string
  category?:  LetterTemplateCategory
  body_html?: string
  variables?: string[]
}

export async function updateLetterTemplate(
  templateId:     string,
  organizationId: string,
  input:          UpdateLetterTemplateInput,
): Promise<LetterTemplateRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('letter_templates')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .eq('organization_id', organizationId)
    .eq('is_default', false)   // never overwrite built-in templates
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) throw Errors.notFound('LetterTemplate')
  return data as LetterTemplateRow
}

export async function softDeleteLetterTemplate(templateId: string, organizationId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('letter_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', templateId)
    .eq('organization_id', organizationId)
    .eq('is_default', false)   // never delete built-in templates
    .is('deleted_at', null)

  if (error) throw Errors.internal()
}

// ── Render ────────────────────────────────────────────────────
// Replace {{variable}} placeholders in body_html with provided values.
// Returns rendered HTML string.
export function renderTemplate(
  template: LetterTemplateRow,
  variables: Record<string, string>,
): string {
  let html = template.body_html
  for (const [key, value] of Object.entries(variables)) {
    // Escape variable values before injecting into HTML (XSS prevention)
    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
    html = html.replaceAll(`{{${key}}}`, escaped)
  }
  return html
}
