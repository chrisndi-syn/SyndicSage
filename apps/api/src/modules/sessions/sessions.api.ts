import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { Errors } from '../../shared/errors.js'

export interface SessionRow {
  id:           string
  created_at:   string
  updated_at:   string
  not_after:    string | null
}

// ── List all active sessions for a user ───────────────────────
// "Active" = not_after is null (no expiry) or not_after is in the future.
export async function getUserSessions(userId: string): Promise<SessionRow[]> {
  const admin = getSupabaseAdmin()

  const { data, error } = await (admin.schema('auth') as any)
    .from('sessions')
    .select('id, created_at, updated_at, not_after')
    .eq('user_id', userId)
    .or('not_after.is.null,not_after.gt.' + new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) throw Errors.internal()

  return (data ?? []) as SessionRow[]
}

// ── Revoke a single session ───────────────────────────────────
// Ownership is enforced by filtering on both session id AND user id.
// A user cannot revoke another user's session even if they know the id.
export async function revokeSession(sessionId: string, userId: string): Promise<void> {
  const admin = getSupabaseAdmin()

  // Confirm the session exists and belongs to this user before deleting
  const { data: existing } = await (admin.schema('auth') as any)
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  if (!existing) throw Errors.notFound('Session')

  const { error } = await (admin.schema('auth') as any)
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId)

  if (error) throw Errors.internal()
}

// ── Revoke all sessions except the current one ────────────────
export async function revokeOtherSessions(userId: string, currentSessionId: string): Promise<void> {
  const admin = getSupabaseAdmin()

  const { error } = await (admin.schema('auth') as any)
    .from('sessions')
    .delete()
    .eq('user_id', userId)
    .neq('id', currentSessionId)

  if (error) throw Errors.internal()
}
