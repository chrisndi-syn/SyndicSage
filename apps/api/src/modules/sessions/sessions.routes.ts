import { Hono } from 'hono'
import { Errors } from '../../shared/errors.js'
import { getUserSessions, revokeSession, revokeOtherSessions } from './sessions.api.js'

// Context variables set by the middleware chain (attachContext → resolveTenant → verifyAccess)
type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

// ── Decode current session id from the JWT ────────────────────
// The Authorization header is already verified by attachContext.
// We decode the payload (not re-verify) to extract session_id.
function getCurrentSessionId(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const payload = JSON.parse(
      Buffer.from(authHeader.slice(7).split('.')[1]!, 'base64url').toString(),
    ) as { session_id?: string }
    return payload.session_id ?? null
  } catch {
    return null
  }
}

// ── GET /api/v1/sessions ──────────────────────────────────────
// Returns all active sessions for the current user.
// Marks the current session with is_current: true.
router.get('/', async (c) => {
  const userId           = c.get('userId') as string
  const currentSessionId = getCurrentSessionId(c.req.header('Authorization'))

  const sessions = await getUserSessions(userId)

  return c.json(
    sessions.map(s => ({
      id:         s.id,
      created_at: s.created_at,
      updated_at: s.updated_at,
      not_after:  s.not_after,
      is_current: s.id === currentSessionId,
    }))
  )
})

// ── DELETE /api/v1/sessions/others ────────────────────────────
// Revokes all sessions except the current one.
// Must be declared before /:sessionId to avoid route collision.
router.delete('/others', async (c) => {
  const userId           = c.get('userId') as string
  const currentSessionId = getCurrentSessionId(c.req.header('Authorization'))

  if (!currentSessionId) throw Errors.unauthorized()

  await revokeOtherSessions(userId, currentSessionId)

  return c.json({ ok: true })
})

// ── DELETE /api/v1/sessions/:sessionId ───────────────────────
// Revokes a specific session. Cannot revoke the current session.
router.delete('/:sessionId', async (c) => {
  const userId           = c.get('userId') as string
  const sessionId        = c.req.param('sessionId')
  const currentSessionId = getCurrentSessionId(c.req.header('Authorization'))

  // Prevent revoking the session you're currently using
  if (sessionId === currentSessionId) {
    throw Errors.badRequest('Use sign out to end your current session')
  }

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRe.test(sessionId)) throw Errors.badRequest('Invalid session id')

  await revokeSession(sessionId, userId)

  return c.json({ ok: true })
})

export { router as sessionsRouter }
