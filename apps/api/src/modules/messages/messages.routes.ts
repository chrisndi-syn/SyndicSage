// ── Messages routes ────────────────────────────────────────────
// GET    /api/v1/messages?building_id=        — list threads for me
// POST   /api/v1/messages?building_id=        — start/reply thread
// PATCH  /api/v1/messages/:id/read            — mark read

import { Hono }          from 'hono'
import { z }             from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }        from '../../shared/authorize.js'
import { Errors }           from '../../shared/errors.js'
import { logAudit }         from '../../shared/logAudit.js'
import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { sendMessageNotificationEmail } from '../../shared/sendEmail.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

const SendInput = z.object({
  body:      z.string().min(1).max(5000),
  subject:   z.string().max(200).optional(),
  thread_id: z.string().uuid().optional(),
})

// ── GET / — list messages (all in building for syndic, own threads for residents) ─

router.get('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'message.read')

  const supabase = getSupabaseAdmin()
  const isSyndic = ['syndic', 'co_syndic'].includes(member.role)

  let query = supabase
    .from('messages')
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (!isSyndic) {
    // Residents only see messages they sent or that are in their threads
    const { data: myThreads } = await supabase
      .from('messages')
      .select('thread_id')
      .eq('building_id', buildingId)
      .eq('sender_user_id', userId)

    const threadIds = (myThreads ?? []).map((r: { thread_id: string }) => r.thread_id)
    if (threadIds.length === 0) return c.json([])

    query = query.in('thread_id', threadIds)
  }

  const { data, error } = await query
  if (error) throw Errors.internal()
  return c.json(data ?? [])
})

// ── POST / — send message ─────────────────────────────────────

router.post('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'message.send')

  const body   = await c.req.json().catch(() => null)
  const parsed = SendInput.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')

  const supabase = getSupabaseAdmin()

  // If replying, validate thread exists in this building
  let threadId = parsed.data.thread_id
  if (threadId) {
    const { data: thread } = await supabase.from('messages').select('id').eq('id', threadId).eq('building_id', buildingId).single()
    if (!thread) throw Errors.notFound('Thread')
  }

  // Insert message — thread_id filled after insert if starting new thread
  const { data: msg, error } = await supabase
    .from('messages')
    .insert({
      building_id:    buildingId,
      organization_id: member.organization_id,
      sender_user_id: userId,
      thread_id:      threadId ?? '00000000-0000-0000-0000-000000000000', // temp, updated below
      subject:        parsed.data.subject ?? null,
      body:           parsed.data.body,
    })
    .select()
    .single()

  if (error || !msg) throw Errors.internal()

  const msgData = msg as { id: string }

  // If new thread: set thread_id = own id
  if (!threadId) {
    threadId = msgData.id
    await supabase.from('messages').update({ thread_id: msgData.id }).eq('id', msgData.id)
  }

  // Notify the other party by email (best effort)
  try {
    const { data: senderProfile } = await supabase.from('profiles').select('full_name,email').eq('id', userId).single()
    const sender = senderProfile as { full_name: string; email: string } | null

    // Find syndic to notify if sender is resident, or find thread starter if sender is syndic
    const isSyndic = ['syndic', 'co_syndic'].includes(member.role)
    if (isSyndic && threadId !== msgData.id) {
      // Reply to resident — find thread starter
      const { data: threadMsg } = await supabase.from('messages').select('sender_user_id').eq('id', threadId).single()
      if (threadMsg) {
        const { data: recipProfile } = await supabase.from('profiles').select('email').eq('id', (threadMsg as { sender_user_id: string }).sender_user_id).single()
        if (recipProfile) {
          const building = await supabase.from('buildings').select('name').eq('id', buildingId).single()
          const appUrl = process.env['APP_URL'] ?? 'https://app.syndicsage.com'
          await sendMessageNotificationEmail({
            to:           (recipProfile as { email: string }).email,
            buildingName: (building.data as { name: string } | null)?.name ?? '',
            senderName:   sender?.full_name ?? 'Syndic',
            subject:      parsed.data.subject ?? 'Reply',
            appUrl:       `${appUrl}/messages`,
          })
        }
      }
    }
  } catch {
    // notification failure must not fail the request
  }

  await logAudit({
    actor_id: userId, action: 'message.sent', resource_type: 'message',
    resource_id: msgData.id, building_id: buildingId, organization_id: member.organization_id,
  })

  return c.json({ ...msg, thread_id: threadId }, 201)
})

// ── PATCH /:id/read — mark read ───────────────────────────────

router.patch('/:id/read', async (c) => {
  const userId     = c.get('userId')
  const buildingId = c.get('buildingId')
  const id         = c.req.param('id')
  const member     = c.get('member')
  if (!member || !buildingId) throw Errors.forbidden()

  const supabase = getSupabaseAdmin()
  const { data: msg } = await supabase.from('messages').select('id,building_id').eq('id', id).single()
  if (!msg || (msg as { building_id: string }).building_id !== buildingId) throw Errors.notFound('Message')

  await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', id)
  return c.json({ ok: true })
})

export { router as messagesRouter }
