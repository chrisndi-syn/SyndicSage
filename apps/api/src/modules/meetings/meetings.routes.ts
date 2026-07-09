// ── Meetings + Votes routes ────────────────────────────────────
// GET    /api/v1/meetings?building_id=          — list meetings
// POST   /api/v1/meetings?building_id=          — create meeting
// PATCH  /api/v1/meetings/:id                   — update meeting
// DELETE /api/v1/meetings/:id                   — soft delete
// GET    /api/v1/meetings/:id/votes              — list votes for a meeting
// POST   /api/v1/meetings/:id/votes              — create vote
// POST   /api/v1/meetings/:id/votes/:vid/cast    — cast a vote
// POST   /api/v1/meetings/:id/votes/:vid/close   — close a vote (syndic)
// POST   /api/v1/meetings/:id/start              — start meeting (creates Daily.co room)
// POST   /api/v1/meetings/:id/end                — end meeting (triggers AI minutes)

import { Hono }          from 'hono'
import { z }             from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }        from '../../shared/authorize.js'
import { Errors }           from '../../shared/errors.js'
import { logAudit }         from '../../shared/logAudit.js'
import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { chatCompletion }   from '../ai/gateway.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

const MeetingInput = z.object({
  title:  z.string().min(1).max(200),
  date:   z.string().datetime({ offset: true }),
  agenda: z.string().max(5000).optional(),
})

const VALID_MAJORITY_TYPES = ['simple_50', 'two_thirds', 'four_fifths'] as const
type MajorityType = typeof VALID_MAJORITY_TYPES[number]

const VoteInput = z.object({
  question:      z.string().min(1).max(500),
  description:   z.string().max(1000).optional(),
  majority_type: z.enum(VALID_MAJORITY_TYPES).optional().default('simple_50'),
})

const VALID_CHOICES = ['yes', 'no', 'abstain'] as const

// ── Meetings CRUD ─────────────────────────────────────────────

router.get('/', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'meeting.read')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .order('date', { ascending: false })

  if (error) throw Errors.internal()
  return c.json(data ?? [])
})

router.post('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'meeting.create')

  const body   = await c.req.json().catch(() => null)
  const parsed = MeetingInput.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('meetings')
    .insert({
      building_id:     buildingId,
      organization_id: member.organization_id,
      title:           parsed.data.title,
      date:            parsed.data.date,
      agenda:          parsed.data.agenda ?? null,
      status:          'scheduled',
    })
    .select()
    .single()

  if (error || !data) throw Errors.internal()

  await logAudit({ actor_id: userId, action: 'meeting.created', resource_type: 'meeting', resource_id: (data as { id: string }).id, building_id: buildingId, organization_id: member.organization_id })
  return c.json(data, 201)
})

router.patch('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const id         = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'meeting.update')

  const body   = await c.req.json().catch(() => null)
  const parsed = MeetingInput.partial().safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')

  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase.from('meetings').select('id').eq('id', id).eq('building_id', buildingId).is('deleted_at', null).single()
  if (!existing) throw Errors.notFound('Meeting')

  const { data, error } = await supabase.from('meetings').update(parsed.data).eq('id', id).select().single()
  if (error || !data) throw Errors.internal()

  await logAudit({ actor_id: userId, action: 'meeting.updated', resource_type: 'meeting', resource_id: id, building_id: buildingId, organization_id: member.organization_id })
  return c.json(data)
})

router.delete('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const id         = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'meeting.update')

  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase.from('meetings').select('id').eq('id', id).eq('building_id', buildingId).single()
  if (!existing) throw Errors.notFound('Meeting')

  await supabase.from('meetings').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  await logAudit({ actor_id: userId, action: 'meeting.deleted', resource_type: 'meeting', resource_id: id, building_id: buildingId, organization_id: member.organization_id })
  return c.body(null, 204)
})

// ── Votes ─────────────────────────────────────────────────────

router.get('/:id/votes', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const meetingId  = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'vote.read')

  const supabase = getSupabaseAdmin()

  // Verify meeting belongs to this building
  const { data: meeting } = await supabase.from('meetings').select('id').eq('id', meetingId).eq('building_id', buildingId).single()
  if (!meeting) throw Errors.notFound('Meeting')

  const { data: votes, error } = await supabase
    .from('votes')
    .select('*, vote_casts(*)')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: true })

  if (error) throw Errors.internal()
  return c.json(votes ?? [])
})

router.post('/:id/votes', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const meetingId  = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'vote.create')

  const body   = await c.req.json().catch(() => null)
  const parsed = VoteInput.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')

  const supabase = getSupabaseAdmin()
  const { data: meeting } = await supabase.from('meetings').select('id').eq('id', meetingId).eq('building_id', buildingId).single()
  if (!meeting) throw Errors.notFound('Meeting')

  const { data, error } = await supabase
    .from('votes')
    .insert({
      meeting_id:      meetingId,
      building_id:     buildingId,
      organization_id: member.organization_id,
      question:        parsed.data.question,
      description:     parsed.data.description ?? null,
      majority_type:   parsed.data.majority_type,
      status:          'open',
      vote_opened_at:  new Date().toISOString(),
    })
    .select()
    .single()

  if (error || !data) throw Errors.internal()
  await logAudit({ actor_id: userId, action: 'vote.created', resource_type: 'vote', resource_id: (data as { id: string }).id, building_id: buildingId, organization_id: member.organization_id })
  return c.json(data, 201)
})

router.post('/:id/votes/:vid/cast', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const voteId     = c.req.param('vid')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'vote.cast')

  const body = await c.req.json().catch(() => null)
  const choiceRaw = (body as { choice?: unknown })?.choice
  if (!choiceRaw || !VALID_CHOICES.includes(choiceRaw as typeof VALID_CHOICES[number])) {
    throw Errors.badRequest('choice must be yes, no, or abstain')
  }
  const choice = choiceRaw as typeof VALID_CHOICES[number]

  const supabase = getSupabaseAdmin()

  // Verify vote is open and belongs to this building
  const { data: vote } = await supabase.from('votes').select('id, status, building_id').eq('id', voteId).single()
  if (!vote || (vote as { building_id: string }).building_id !== buildingId) throw Errors.notFound('Vote')
  if ((vote as { status: string }).status !== 'open') throw Errors.badRequest('Vote is not open')

  // Get unit for the voter (required for weighted vote)
  if (!member.unit_id) throw Errors.badRequest('You must be assigned to a unit to vote')

  // Get ownership weight
  const { data: unit } = await supabase.from('units').select('ownership_share').eq('id', member.unit_id).single()
  const voteWeight = (unit as { ownership_share: number } | null)?.ownership_share ?? 1

  const { data, error } = await supabase
    .from('vote_casts')
    .upsert({
      vote_id:         voteId,
      user_id:         userId,
      unit_id:         member.unit_id,
      organization_id: member.organization_id,
      choice,
      vote_weight:     voteWeight,
    }, { onConflict: 'vote_id,unit_id' })
    .select()
    .single()

  if (error || !data) throw Errors.internal()
  await logAudit({ actor_id: userId, action: 'vote.cast', resource_type: 'vote', resource_id: voteId, building_id: buildingId, organization_id: member.organization_id, metadata: { choice } })
  return c.json(data)
})

router.post('/:id/votes/:vid/close', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const voteId     = c.req.param('vid')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'vote.close')

  const supabase = getSupabaseAdmin()
  const { data: vote } = await supabase.from('votes').select('id, building_id').eq('id', voteId).single()
  if (!vote || (vote as { building_id: string }).building_id !== buildingId) throw Errors.notFound('Vote')

  await supabase.from('votes').update({ status: 'closed', vote_closed_at: new Date().toISOString() }).eq('id', voteId)
  await logAudit({ actor_id: userId, action: 'vote.closed', resource_type: 'vote', resource_id: voteId, building_id: buildingId, organization_id: member.organization_id })
  return c.json({ ok: true })
})

// ── Meeting room: start ───────────────────────────────────────

router.post('/:id/start', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const meetingId  = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'meeting.update')

  const supabase   = getSupabaseAdmin()
  const DAILY_KEY  = process.env['DAILY_API_KEY']

  let roomName: string
  let roomUrl:  string

  if (DAILY_KEY) {
    // Create Daily.co room with transcription enabled
    const res = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: { Authorization: `Bearer ${DAILY_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: { enable_transcription: true, max_participants: 50, exp: Math.floor(Date.now() / 1000) + 7200 },
      }),
    })
    if (!res.ok) throw Errors.internal()
    const room = await res.json() as { name: string; url: string }
    roomName = room.name
    roomUrl  = room.url
  } else {
    // Dev fallback — no Daily.co key configured
    roomName = `dev-meeting-${meetingId.slice(0, 8)}`
    roomUrl  = `https://syndicsage.daily.co/${roomName}`
  }

  const { data, error } = await supabase
    .from('meetings')
    .update({ status: 'in_progress', daily_room_name: roomName, daily_room_url: roomUrl, started_at: new Date().toISOString() })
    .eq('id', meetingId)
    .eq('building_id', buildingId)
    .select()
    .single()

  if (error || !data) throw Errors.internal()

  // Generate syndic token if Daily.co is configured
  let token: string | null = null
  if (DAILY_KEY) {
    const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: { Authorization: `Bearer ${DAILY_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { room_name: roomName, is_owner: true, exp: Math.floor(Date.now() / 1000) + 7200 } }),
    })
    if (tokenRes.ok) {
      const t = await tokenRes.json() as { token: string }
      token = t.token
    }
  }

  await logAudit({ actor_id: userId, action: 'meeting.started', resource_type: 'meeting', resource_id: meetingId, building_id: buildingId, organization_id: member.organization_id })
  return c.json({ meeting: data, token, room_url: roomUrl })
})

// ── Meeting room: end + AI minutes ───────────────────────────

router.post('/:id/end', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const meetingId  = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'meeting.update')

  const supabase = getSupabaseAdmin()

  // Fetch meeting + votes for AI minutes
  const { data: meeting } = await supabase.from('meetings').select('*').eq('id', meetingId).eq('building_id', buildingId).single()
  if (!meeting) throw Errors.notFound('Meeting')

  const m = meeting as { title: string; agenda: string | null; transcript: string | null; status: string }

  // Update status
  await supabase.from('meetings').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', meetingId)

  // Delete Daily.co room if configured
  const DAILY_KEY = process.env['DAILY_API_KEY']
  if (DAILY_KEY && (meeting as { daily_room_name?: string }).daily_room_name) {
    await fetch(`https://api.daily.co/v1/rooms/${(meeting as { daily_room_name: string }).daily_room_name}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${DAILY_KEY}` },
    }).catch(() => {})
  }

  // Generate AI minutes if there's a transcript or agenda
  const context = [
    m.agenda ? `Agenda:\n${m.agenda}` : '',
    m.transcript ? `Transcript:\n${m.transcript}` : '',
  ].filter(Boolean).join('\n\n')

  if (context) {
    try {
      const result = await chatCompletion(
        [{ role: 'user', content: context }],
        `You are generating official Belgian VME meeting minutes for "${m.title}". Write concise, professional minutes in the same language as the transcript/agenda. Format as plain text with clear sections.`,
        'claude-sonnet-4-6',
      )
      await supabase.from('meetings').update({ minutes: result.content }).eq('id', meetingId)
    } catch (err) {
      console.error('[meetings/end] AI minutes failed:', err)
    }
  }

  await logAudit({ actor_id: userId, action: 'meeting.ended', resource_type: 'meeting', resource_id: meetingId, building_id: buildingId, organization_id: member.organization_id })
  return c.json({ ok: true })
})

export { router as meetingsRouter }
