import type { Context, Next } from 'hono'
import { Errors } from '../errors.js'
import { getSupabaseAdmin } from '../supabaseAdmin.js'

// ── attachContext ─────────────────────────────────────────────
// Step 3 of the middleware chain.
// Fetches the user's profile and attaches the full verified
// context to the request. Route handlers read from c.get()
// and never re-fetch these values.
//
// After this middleware every route handler has:
//   c.get('userId')     — authenticated user id
//   c.get('member')     — building_members row (if building-scoped)
//   c.get('buildingId') — resolved building id (if building-scoped)

export async function attachContext(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) throw Errors.unauthorized()

  const token = authHeader.slice(7)

  const supabase = getSupabaseAdmin()
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) throw Errors.unauthorized()

  c.set('userId', user.id)
  return next()
}
