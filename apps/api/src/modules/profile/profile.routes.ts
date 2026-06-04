// ── Profile routes ─────────────────────────────────────────────
// GET   /api/v1/profile         — get current user's profile
// PATCH /api/v1/profile         — update full_name and/or preferred_language
// POST  /api/v1/profile/avatar  — upload/replace profile picture

import { Hono } from 'hono'
import { z }    from 'zod'
import { Errors }           from '../../shared/errors.js'
import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

const ALLOWED_LANGUAGES  = ['en', 'fr', 'nl'] as const
const AVATAR_MIME_TYPES  = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const AVATAR_MAX_BYTES   = 2 * 1024 * 1024  // 2 MB
const AVATAR_BUCKET      = 'avatars'

type ProfileRow = {
  full_name:          string
  email:              string
  preferred_language?: string
  avatar_url?:        string | null
}

// ── GET /profile ──────────────────────────────────────────────
router.get('/', async (c) => {
  const userId   = c.get('userId')
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, email, preferred_language, avatar_url')
    .eq('id', userId)
    .single()

  if (error || !data) throw Errors.notFound('Profile not found')

  const row = data as ProfileRow
  return c.json({
    full_name:          row.full_name,
    email:              row.email,
    preferred_language: row.preferred_language ?? 'fr',
    avatar_url:         row.avatar_url ?? null,
  })
})

// ── PATCH /profile ────────────────────────────────────────────
const PatchSchema = z.object({
  full_name:          z.string().min(1).max(100).optional(),
  preferred_language: z.enum(ALLOWED_LANGUAGES).optional(),
})

router.patch('/', async (c) => {
  const userId  = c.get('userId')
  const body    = await c.req.json() as unknown
  const parsed  = PatchSchema.safeParse(body)

  if (!parsed.success) throw Errors.badRequest('Invalid input')

  const updates = parsed.data
  if (Object.keys(updates).length === 0) throw Errors.badRequest('Nothing to update')

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('full_name, email, preferred_language, avatar_url')
    .single()

  if (error) throw Errors.internal()

  const row = data as ProfileRow
  return c.json({
    full_name:          row.full_name,
    email:              row.email,
    preferred_language: row.preferred_language ?? 'fr',
    avatar_url:         row.avatar_url ?? null,
  })
})

// ── POST /profile/avatar ──────────────────────────────────────
router.post('/avatar', async (c) => {
  const userId   = c.get('userId')
  const supabase = getSupabaseAdmin()

  const formData = await c.req.formData().catch(() => null)
  if (!formData) throw Errors.badRequest('Expected multipart/form-data')

  const file = formData.get('avatar')
  if (!file || !(file instanceof File)) throw Errors.badRequest('avatar field is required')

  // MIME whitelist (S4)
  if (!AVATAR_MIME_TYPES.has(file.type)) {
    throw Errors.badRequest('Only JPEG, PNG, and WebP images are allowed')
  }

  // Size limit
  if (file.size > AVATAR_MAX_BYTES) {
    throw Errors.badRequest('Image must be under 2 MB')
  }

  // Extension from MIME type — never trust the filename
  const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'

  // Fixed path per user — uploading a new photo replaces the old one (upsert)
  const storagePath = `${userId}/avatar.${ext}`

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, fileBuffer, { contentType: file.type, upsert: true })

  if (uploadError) throw Errors.internal()

  // Build public URL
  const supabaseUrl = process.env['SUPABASE_URL'] ?? ''
  const publicUrl   = `${supabaseUrl}/storage/v1/object/public/${AVATAR_BUCKET}/${storagePath}`

  // Persist to profile
  const { data, error: dbError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId)
    .select('full_name, email, preferred_language, avatar_url')
    .single()

  if (dbError) throw Errors.internal()

  const row = data as ProfileRow
  return c.json({
    full_name:          row.full_name,
    email:              row.email,
    preferred_language: row.preferred_language ?? 'fr',
    avatar_url:         row.avatar_url ?? null,
  })
})

export { router as profileRouter }
