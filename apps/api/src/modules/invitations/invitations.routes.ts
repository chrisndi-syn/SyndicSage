// ── Invitations routes ─────────────────────────────────────────
// GET    /api/v1/invitations?building_id=     — list invitations
// POST   /api/v1/invitations?building_id=     — send invitation
// DELETE /api/v1/invitations/:id?building_id= — revoke
// GET    /api/v1/invitations/accept?token=    — validate token (pre-accept)
// POST   /api/v1/invitations/accept           — accept (authed user)

import { Hono }          from 'hono'
import { z }             from 'zod'
import crypto            from 'crypto'
import type { UserRole } from '@syndicsage/types'
import { authorize }        from '../../shared/authorize.js'
import { Errors }           from '../../shared/errors.js'
import { logAudit }         from '../../shared/logAudit.js'
import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { sendInvitationEmail } from '../../shared/sendEmail.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

const VALID_ROLES = ['co_syndic', 'co_owner', 'renter'] as const

const SendInput = z.object({
  email:   z.string().email(),
  role:    z.enum(VALID_ROLES),
  unit_id: z.string().uuid().optional(),
})

// ── GET / — list pending invitations ─────────────────────────

router.get('/', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'invitation.create')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('building_id', buildingId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw Errors.internal()
  return c.json(data ?? [])
})

// ── POST / — send invitation ──────────────────────────────────

router.post('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'invitation.create')

  const body   = await c.req.json().catch(() => null)
  const parsed = SendInput.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { email, role, unit_id } = parsed.data

  const supabase = getSupabaseAdmin()

  // Check if this email is already a member of the building
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (profiles) {
    const { data: existing } = await supabase
      .from('building_members')
      .select('id')
      .eq('building_id', buildingId)
      .eq('user_id', profiles.id)
      .single()
    if (existing) throw Errors.conflict('This person is already a member of this building')
  }

  // Check for existing pending invite
  const { data: existingInvite } = await supabase
    .from('invitations')
    .select('id')
    .eq('building_id', buildingId)
    .eq('email', email)
    .eq('status', 'pending')
    .is('deleted_at', null)
    .single()
  if (existingInvite) throw Errors.conflict('A pending invitation already exists for this email')

  // Get building name for the email
  const { data: building } = await supabase.from('buildings').select('name').eq('id', buildingId).single()

  const token = crypto.randomBytes(32).toString('hex')
  const { data: invite, error } = await supabase
    .from('invitations')
    .insert({
      building_id:     buildingId,
      organization_id: member.organization_id,
      invited_by:      userId,
      email,
      role,
      unit_id:         unit_id ?? null,
      token,
      status:          'pending',
    })
    .select()
    .single()

  if (error || !invite) throw Errors.internal()

  // Send invitation email
  const appUrl = process.env['APP_URL'] ?? 'https://app.syndicsage.com'
  await sendInvitationEmail({
    to:           email,
    buildingName: (building as { name: string } | null)?.name ?? 'your building',
    role,
    inviteUrl:    `${appUrl}/invite/accept?token=${token}`,
  }).catch(err => console.error('[invitations] email failed:', err))

  await logAudit({
    actor_id: userId, action: 'invitation_sent', resource_type: 'invitation',
    resource_id: (invite as { id: string }).id, building_id: buildingId, organization_id: member.organization_id,
    metadata: { email, role },
  })

  return c.json(invite, 201)
})

// ── DELETE /:id — revoke ──────────────────────────────────────

router.delete('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const id         = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'invitation.revoke')

  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase.from('invitations').select('id').eq('id', id).eq('building_id', buildingId).single()
  if (!existing) throw Errors.notFound('Invitation')

  await supabase.from('invitations').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  await logAudit({
    actor_id: userId, action: 'invitation_revoked', resource_type: 'invitation',
    resource_id: id, building_id: buildingId, organization_id: member.organization_id,
  })

  return c.body(null, 204)
})

// ── GET /accept?token= — validate token (no auth required) ───

router.get('/accept', async (c) => {
  const token = c.req.query('token')
  if (!token) throw Errors.badRequest('token required')

  const supabase = getSupabaseAdmin()
  const { data: invite } = await supabase
    .from('invitations')
    .select('*, buildings(name)')
    .eq('token', token)
    .eq('status', 'pending')
    .is('deleted_at', null)
    .single()

  if (!invite) throw Errors.notFound('Invitation not found or already used')

  const inv = invite as { expires_at: string; email: string; role: string; building_id: string; buildings: { name: string } | null }
  if (new Date(inv.expires_at) < new Date()) {
    await supabase.from('invitations').update({ status: 'expired' }).eq('token', token)
    throw Errors.badRequest('This invitation has expired')
  }

  return c.json({
    email:         inv.email,
    role:          inv.role,
    building_id:   inv.building_id,
    building_name: inv.buildings?.name ?? 'your building',
  })
})

// ── POST /accept — accept after auth ─────────────────────────

router.post('/accept', async (c) => {
  const userId = c.get('userId')
  const body   = await c.req.json().catch(() => null)
  const token  = (body as { token?: string } | null)?.token
  if (!token) throw Errors.badRequest('token required')

  const supabase = getSupabaseAdmin()
  const { data: invite } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .is('deleted_at', null)
    .single()

  if (!invite) throw Errors.notFound('Invitation not found or already used')

  const inv = invite as { id: string; expires_at: string; building_id: string; role: string; unit_id: string | null; organization_id: string; email: string }
  if (new Date(inv.expires_at) < new Date()) {
    await supabase.from('invitations').update({ status: 'expired' }).eq('token', token)
    throw Errors.badRequest('This invitation has expired')
  }

  // Check that the authed user's email matches the invitation
  const { data: profile } = await supabase.from('profiles').select('email').eq('id', userId).single()
  const profileEmail = (profile as { email: string } | null)?.email ?? ''
  if (profileEmail.toLowerCase() !== inv.email.toLowerCase()) {
    throw Errors.forbidden()
  }

  // Create the building_member row
  const { error: memberError } = await supabase
    .from('building_members')
    .upsert({
      building_id: inv.building_id,
      user_id:     userId,
      role:        inv.role,
      unit_id:     inv.unit_id,
      invited_by:  null,
      joined_at:   new Date().toISOString(),
    }, { onConflict: 'building_id,user_id' })

  if (memberError) throw Errors.internal()

  // Mark invitation accepted
  await supabase.from('invitations').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', inv.id)

  await logAudit({
    actor_id: userId, action: 'invitation_accepted', resource_type: 'invitation',
    resource_id: inv.id, building_id: inv.building_id, organization_id: inv.organization_id,
  })

  return c.json({ ok: true, building_id: inv.building_id, role: inv.role })
})

export { router as invitationsRouter }
