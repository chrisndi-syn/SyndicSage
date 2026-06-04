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
  if (buildingId.startsWith('mock-')) {
    return MOCK_DOCUMENTS[buildingId] ?? []
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return MOCK_DOCUMENTS[buildingId] ?? []

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

// ── Mock data ─────────────────────────────────────────────────
const MOCK_DOCUMENTS: Record<string, Document[]> = {
  'mock-building-1': [
    {
      id:               'mock-doc-1',
      building_id:      'mock-building-1',
      organization_id:  'mock-org-1',
      name:             'AG Minutes — May 2026',
      category:         'minutes',
      visibility:       'all_residents',
      storage_path:     'mock/path/doc1.pdf',
      file_size:        142500,
      mime_type:        'application/pdf',
      uploaded_by:      'mock-user-1',
      virus_scanned_at: new Date().toISOString(),
      created_at:       new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id:               'mock-doc-2',
      building_id:      'mock-building-1',
      organization_id:  'mock-org-1',
      name:             'Annual Budget 2026',
      category:         'budget',
      visibility:       'all_residents',
      storage_path:     'mock/path/doc2.pdf',
      file_size:        89000,
      mime_type:        'application/pdf',
      uploaded_by:      'mock-user-1',
      virus_scanned_at: new Date().toISOString(),
      created_at:       new Date(Date.now() - 14 * 86400000).toISOString(),
    },
    {
      id:               'mock-doc-3',
      building_id:      'mock-building-1',
      organization_id:  'mock-org-1',
      name:             'Insurance Policy — AXA 2026',
      category:         'insurance',
      visibility:       'syndic_only',
      storage_path:     'mock/path/doc3.pdf',
      file_size:        215000,
      mime_type:        'application/pdf',
      uploaded_by:      'mock-user-1',
      virus_scanned_at: new Date().toISOString(),
      created_at:       new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id:               'mock-doc-4',
      building_id:      'mock-building-1',
      organization_id:  'mock-org-1',
      name:             'Lift Maintenance Contract',
      category:         'contract',
      visibility:       'syndic_only',
      storage_path:     'mock/path/doc4.pdf',
      file_size:        67000,
      mime_type:        'application/pdf',
      uploaded_by:      'mock-user-1',
      virus_scanned_at: new Date().toISOString(),
      created_at:       new Date(Date.now() - 60 * 86400000).toISOString(),
    },
  ],
}
