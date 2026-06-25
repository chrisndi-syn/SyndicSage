// ── Portal routes — resident-facing data ──────────────────────
// GET  /api/v1/portal/me?building_id=      — resident snapshot
// GET  /api/v1/portal/profile?building_id= — resident profile
// PATCH /api/v1/portal/profile             — update resident fields

import { Hono }          from 'hono'
import { z }             from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }        from '../../shared/authorize.js'
import { Errors }           from '../../shared/errors.js'
import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

// ── GET /me — resident snapshot ───────────────────────────────

router.get('/me', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'charge.read.own')

  const supabase = getSupabaseAdmin()

  // 1. Building info
  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address, city, ag_date')
    .eq('id', buildingId)
    .single()

  // 2. My unit info
  let unit = null
  if (member.unit_id) {
    const { data } = await supabase
      .from('units')
      .select('id, unit_number, floor, unit_type, ownership_share')
      .eq('id', member.unit_id)
      .single()
    unit = data
  }

  // 3. My charges
  let ownerIdForCharges: string | null = null
  if (member.unit_id) {
    const { data: ownerRow } = await supabase
      .from('owners')
      .select('id')
      .eq('unit_id', member.unit_id)
      .eq('building_id', buildingId)
      .is('deleted_at', null)
      .single()
    ownerIdForCharges = (ownerRow as { id: string } | null)?.id ?? null
  }

  const chargesQuery = ownerIdForCharges
    ? supabase.from('charges').select('*').eq('building_id', buildingId).eq('owner_id', ownerIdForCharges).is('deleted_at', null).order('due_date', { ascending: false }).limit(20)
    : supabase.from('charges').select('*').eq('building_id', buildingId).is('owner_id', null).is('deleted_at', null).order('due_date', { ascending: false }).limit(20)

  const { data: charges } = await chargesQuery

  // 4. My unread messages
  const { data: messages } = await supabase
    .from('messages')
    .select('id, thread_id, subject, body, sender_user_id, read_at, created_at')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })
    .limit(20)

  // 5. Upcoming meetings (co_owner can attend AG)
  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, title, date, status, agenda')
    .eq('building_id', buildingId)
    .neq('status', 'completed')
    .is('deleted_at', null)
    .order('date', { ascending: true })
    .limit(5)

  // 6. Public documents
  const { data: documents } = await supabase
    .from('documents')
    .select('id, name, category, created_at')
    .eq('building_id', buildingId)
    .eq('visibility', 'all_residents')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)

  return c.json({
    building,
    unit,
    charges:   charges  ?? [],
    messages:  messages ?? [],
    meetings:  meetings ?? [],
    documents: documents ?? [],
  })
})

// ── GET /profile — resident profile snapshot ──────────────────

router.get('/profile', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'charge.read.own')

  const supabase = getSupabaseAdmin()

  // Profile (auth user)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, preferred_language, avatar_url')
    .eq('id', userId)
    .single()

  if (!profile) throw Errors.notFound('Profile not found')

  // Member fields (resident-specific)
  const { data: memberRow } = await supabase
    .from('building_members')
    .select('role, joined_at, left_at, occupant_count, mailing_address')
    .eq('id', member.id)
    .single()

  // Unit info (read-only)
  let unitNumber: string | null = null
  if (member.unit_id) {
    const { data: unit } = await supabase
      .from('units')
      .select('unit_number')
      .eq('id', member.unit_id)
      .single()
    unitNumber = (unit as { unit_number: string } | null)?.unit_number ?? null
  }

  // Building info
  const { data: building } = await supabase
    .from('buildings')
    .select('name, address, city')
    .eq('id', buildingId)
    .single()

  const row = memberRow as {
    role: string; joined_at: string | null; left_at: string | null;
    occupant_count: number | null; mailing_address: string | null
  } | null

  const prof = profile as { full_name: string; email: string; preferred_language?: string | null; avatar_url?: string | null }

  return c.json({
    full_name:          prof.full_name,
    email:              prof.email,
    preferred_language: prof.preferred_language ?? 'fr',
    avatar_url:         prof.avatar_url ?? null,
    role:               row?.role ?? member.role,
    unit_number:        unitNumber,
    joined_at:          row?.joined_at ?? null,
    left_at:            row?.left_at ?? null,
    occupant_count:     row?.occupant_count ?? null,
    mailing_address:    row?.mailing_address ?? null,
    building_name:      (building as { name: string } | null)?.name ?? null,
    building_address:   building ? `${(building as { address: string; city: string }).address}, ${(building as { address: string; city: string }).city}` : null,
  })
})

// ── PATCH /profile — update resident fields ───────────────────

const PortalProfilePatchSchema = z.object({
  mailing_address: z.string().max(300).nullable().optional(),
  occupant_count:  z.number().int().min(1).max(99).nullable().optional(),
  left_at:         z.string().datetime({ offset: true }).nullable().optional(),
})

router.patch('/profile', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()

  authorize(member.role as UserRole, 'charge.read.own')

  const body   = await c.req.json() as unknown
  const parsed = PortalProfilePatchSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest('Invalid input')

  const updates = parsed.data
  if (Object.keys(updates).length === 0) throw Errors.badRequest('Nothing to update')

  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('building_members')
    .update(updates)
    .eq('id', member.id)

  if (error) throw Errors.internal()

  return c.json({ ok: true })
})

export { router as portalRouter }
