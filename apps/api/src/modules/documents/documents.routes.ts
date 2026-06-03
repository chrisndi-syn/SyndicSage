// ── Documents routes ──────────────────────────────────────────
// GET    /api/v1/documents?building_id=            — list
// POST   /api/v1/documents?building_id=            — upload (multipart/form-data)
// GET    /api/v1/documents/:id/download?building_id= — get signed URL
// DELETE /api/v1/documents/:id?building_id=        — soft-delete

import { Hono } from 'hono'
import type { UserRole } from '@syndicsage/types'
import { authorize }    from '../../shared/authorize.js'
import { Errors }       from '../../shared/errors.js'
import { logAudit }     from '../../shared/logAudit.js'
import {
  listDocuments, storeDocument, getDocument, getSignedUrl, softDeleteDocument,
  isValidCategory, isValidVisibility, ALLOWED_MIME_TYPES, MAX_FILE_SIZE,
} from './documents.api.js'
import { canReadDocument, canUploadDocument, canDeleteDocument } from './documents.policy.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

// ── GET / ─────────────────────────────────────────────────────
router.get('/', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  const role = member.role as UserRole
  authorize(role, 'document.read.all')

  // Residents only see all_residents docs — enforced here + RLS
  const visibility = (role === 'co_owner' || role === 'renter') ? 'all_residents' as const : undefined

  const docs = await listDocuments(buildingId, visibility)
  return c.json(docs)
})

// ── POST / — upload ───────────────────────────────────────────
router.post('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'document.upload')
  if (!canUploadDocument(member.role as UserRole)) throw Errors.forbidden()

  // Parse multipart form data
  const formData = await c.req.formData().catch(() => null)
  if (!formData) throw Errors.badRequest('Expected multipart/form-data')

  const file       = formData.get('file')
  const name       = formData.get('name')
  const category   = formData.get('category')
  const visibility = formData.get('visibility')

  if (!file || !(file instanceof File)) throw Errors.badRequest('file is required')
  if (!name || typeof name !== 'string' || !name.trim()) throw Errors.badRequest('name is required')
  if (!category || typeof category !== 'string' || !isValidCategory(category)) {
    throw Errors.badRequest('Invalid category')
  }
  if (!visibility || typeof visibility !== 'string' || !isValidVisibility(visibility)) {
    throw Errors.badRequest('Invalid visibility')
  }

  // MIME type whitelist
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw Errors.badRequest('Only PDF, JPEG, and PNG files are allowed')
  }

  // Size limit
  if (file.size > MAX_FILE_SIZE) {
    throw Errors.badRequest('File exceeds 20MB limit')
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  const { row } = await storeDocument(
    {
      building_id:     buildingId,
      organization_id: member.organization_id,
      uploaded_by:     userId,
      name:            name.trim().slice(0, 255),
      category,
      visibility,
      mime_type:       file.type,
      file_size:       file.size,
    },
    fileBuffer,
  )

  await logAudit({
    actor_id:        userId,
    action:          'document_upload',
    resource_type:   'document',
    resource_id:     row.id,
    building_id:     buildingId,
    organization_id: member.organization_id,
    metadata:        { name: row.name, category: row.category, visibility: row.visibility },
  })

  // Queue virus scan
  // Worker will set virus_scanned_at when scan completes
  // (BullMQ job enqueue — skipped until Redis is wired; document stays hidden until scanned)
  // TODO: await enqueueJob({ type: 'scan_file', payload: { documentId: row.id, storagePath: row.storage_path } })

  return c.json({ ...row, message: 'Upload received. File will be available after virus scan.' }, 201)
})

// ── GET /:id/download ─────────────────────────────────────────
router.get('/:id/download', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const docId      = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'document.download')

  const doc = await getDocument(docId, buildingId)

  // Layer 3 — resource policy
  if (!canReadDocument(member.role as UserRole, doc)) throw Errors.forbidden()

  const signedUrl = await getSignedUrl(doc.storage_path)

  await logAudit({
    actor_id:      userId,
    action:        'document_download',
    resource_type: 'document',
    resource_id:   docId,
    building_id:   buildingId,
    metadata:      { name: doc.name },
  })

  return c.json({ url: signedUrl, expires_in: 900 })
})

// ── DELETE /:id ───────────────────────────────────────────────
router.delete('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const docId      = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'document.delete')
  if (!canDeleteDocument(member.role as UserRole)) throw Errors.forbidden()

  await softDeleteDocument(docId, buildingId)

  await logAudit({
    actor_id:      userId,
    action:        'document_delete',
    resource_type: 'document',
    resource_id:   docId,
    building_id:   buildingId,
  })

  return c.body(null, 204)
})

export { router as documentsRouter }
