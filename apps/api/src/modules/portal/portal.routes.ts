// ── Portal routes — resident-facing data ──────────────────────
// GET /api/v1/portal/me?building_id=  — resident snapshot

import { Hono }          from 'hono'
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

export { router as portalRouter }
