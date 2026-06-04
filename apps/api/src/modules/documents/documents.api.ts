// ── Documents repository layer ────────────────────────────────
//
// Upload flow (enforced here, never bypass):
//   1. Hono validates MIME + size before this layer is called
//   2. File stored with UUID filename — original name in metadata only
//   3. virus_scanned_at = NULL until ClamAV job completes
//   4. Documents with virus_scanned_at IS NULL are invisible via RLS
//
// Download flow:
//   1. authorize() check in route
//   2. Generate signed URL (15 min) — never expose storage_path directly
//   3. Log to audit_log

import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { Errors }           from '../../shared/errors.js'
import { randomUUID }       from 'crypto'

export interface DocumentRow {
  id:               string
  building_id:      string
  organization_id:  string
  name:             string
  category:         string
  visibility:       string
  storage_path:     string
  file_size:        number | null
  mime_type:        string | null
  checksum:         string | null
  uploaded_by:      string
  virus_scanned_at: string | null
  created_at:       string
  deleted_at:       string | null
}

const VALID_CATEGORIES   = ['minutes','budget','contract','insurance','legal','maintenance','acte_de_base','other'] as const
const VALID_VISIBILITIES = ['syndic_only','all_residents'] as const

export type DocumentCategory   = typeof VALID_CATEGORIES[number]
export type DocumentVisibility = typeof VALID_VISIBILITIES[number]

export function isValidCategory(v: string): v is DocumentCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(v)
}
export function isValidVisibility(v: string): v is DocumentVisibility {
  return (VALID_VISIBILITIES as readonly string[]).includes(v)
}

// Allowed MIME types — whitelist only
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
])
export const MAX_FILE_SIZE = 20 * 1024 * 1024  // 20 MB

export async function listDocuments(
  buildingId:  string,
  visibility?: DocumentVisibility,
): Promise<DocumentRow[]> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('documents')
    .select('*')
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    // Only show virus-scanned documents — unscanned are invisible
    .not('virus_scanned_at', 'is', null)
    .order('created_at', { ascending: false })

  if (visibility) query = query.eq('visibility', visibility)

  const { data, error } = await query
  if (error) throw Errors.internal()
  return (data ?? []) as DocumentRow[]
}

export interface StoreDocumentInput {
  building_id:     string
  organization_id: string
  uploaded_by:     string
  name:            string
  category:        DocumentCategory
  visibility:      DocumentVisibility
  mime_type:       string
  file_size:       number
}

// Returns the generated UUID storage path and the DB row
export async function storeDocument(
  input:   StoreDocumentInput,
  fileBuffer: Buffer,
): Promise<{ row: DocumentRow; storagePath: string }> {
  const supabase    = getSupabaseAdmin()
  const uuid        = randomUUID()
  // Path: {org_id}/{building_id}/documents/{uuid}
  const storagePath = `${input.organization_id}/${input.building_id}/documents/${uuid}`

  // Upload to private bucket
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, fileBuffer, {
      contentType:  input.mime_type,
      upsert:       false,
    })

  if (uploadError) throw Errors.internal()

  // Insert DB row — virus_scanned_at NULL until worker sets it
  const { data, error } = await supabase
    .from('documents')
    .insert({
      building_id:     input.building_id,
      organization_id: input.organization_id,
      name:            input.name,
      category:        input.category,
      visibility:      input.visibility,
      storage_path:    storagePath,
      file_size:       input.file_size,
      mime_type:       input.mime_type,
      uploaded_by:     input.uploaded_by,
      virus_scanned_at: null,
    })
    .select()
    .single()

  if (error || !data) {
    // Cleanup uploaded file if DB insert fails
    await supabase.storage.from('documents').remove([storagePath])
    throw Errors.internal()
  }

  return { row: data as DocumentRow, storagePath }
}

// Generate a 15-minute signed URL for download
export async function getSignedUrl(storagePath: string): Promise<string> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 60 * 15)  // 15 minutes

  if (error || !data?.signedUrl) throw Errors.internal()
  return data.signedUrl
}

export async function softDeleteDocument(documentId: string, buildingId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', documentId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)

  if (error) throw Errors.internal()
}

export async function getDocument(documentId: string, buildingId: string): Promise<DocumentRow> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .single()

  if (error || !data) throw Errors.notFound('Document')
  return data as DocumentRow
}
