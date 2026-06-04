// ── Profile routes ─────────────────────────────────────────────
// GET   /api/v1/profile   — get current user's profile
// PATCH /api/v1/profile   — update full_name and/or preferred_language

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

const ALLOWED_LANGUAGES = ['en', 'fr', 'nl'] as const

// ── GET /profile ──────────────────────────────────────────────
router.get('/', async (c) => {
  const userId  = c.get('userId')
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, email, preferred_language')
    .eq('id', userId)
    .single()

  if (error || !data) throw Errors.notFound('Profile not found')

  return c.json({
    full_name:          (data as { full_name: string; email: string; preferred_language?: string }).full_name,
    email:              (data as { full_name: string; email: string; preferred_language?: string }).email,
    preferred_language: (data as { full_name: string; email: string; preferred_language?: string }).preferred_language ?? 'fr',
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
    .select('full_name, email, preferred_language')
    .single()

  if (error) throw Errors.internal()

  return c.json({
    full_name:          (data as { full_name: string; email: string; preferred_language?: string }).full_name,
    email:              (data as { full_name: string; email: string; preferred_language?: string }).email,
    preferred_language: (data as { full_name: string; email: string; preferred_language?: string }).preferred_language ?? 'fr',
  })
})

export { router as profileRouter }
