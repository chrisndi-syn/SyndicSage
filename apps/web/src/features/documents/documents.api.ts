// ── Documents client API ──────────────────────────────────────

import { supabase }  from '../../lib/supabase'
import { apiFetch }  from '../../lib/api'

export interface Document {
  id:               string
  building_id:      string
  organization_id:  string
  name:             string
  category:         string
  visibility:       string
  storage_path:     string
  file_size:        number | null
  mime_type:        string | null
  uploaded_by:      string
  virus_scanned_at: string | null
  created_at:       string
}

export const DOCUMENT_CATEGORIES = [
  'minutes', 'budget', 'contract', 'insurance', 'legal', 'maintenance', 'acte_de_base', 'other',
] as const

export async function fetchDocuments(buildingId: string): Promise<Document[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .not('virus_scanned_at', 'is', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Document[]
}

// Upload via Hono (multipart — NOT direct to storage)
export async function apiUploadDocument(
  token:      string,
  buildingId: string,
  file:       File,
  name:       string,
  category:   string,
  visibility: string,
): Promise<Document> {
  const API_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3001'
  const form    = new FormData()
  form.append('file',       file)
  form.append('name',       name)
  form.append('category',   category)
  form.append('visibility', visibility)

  const res = await fetch(`${API_URL}/api/v1/documents?building_id=${buildingId}`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body:    form,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? 'Upload failed')
  }

  return res.json() as Promise<Document>
}

// Get signed download URL
export async function apiGetDownloadUrl(
  token:      string,
  buildingId: string,
  documentId: string,
): Promise<string> {
  const result = await apiFetch<{ url: string }>(
    `/api/v1/documents/${documentId}/download?building_id=${buildingId}`,
    token,
  )
  return result.url
}

export async function apiDeleteDocument(
  token:      string,
  buildingId: string,
  documentId: string,
): Promise<void> {
  await apiFetch(`/api/v1/documents/${documentId}?building_id=${buildingId}`, token, {
    method: 'DELETE',
  })
}

