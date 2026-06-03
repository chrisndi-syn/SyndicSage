// ── Tickets routes ────────────────────────────────────────────
// GET    /api/v1/tickets?building_id=           — list (syndic: all, resident: own)
// POST   /api/v1/tickets?building_id=           — create
// PATCH  /api/v1/tickets/:id?building_id=       — update status/title/description
// POST   /api/v1/tickets/:id/close?building_id= — close (syndic only)

import { Hono } from 'hono'
import { z }    from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }    from '../../shared/authorize.js'
import { Errors }       from '../../shared/errors.js'
import { logAudit }     from '../../shared/logAudit.js'
import {
  listTickets, listOwnTickets, createTicket, updateTicket, closeTicket,
  isValidTicketType, isValidTicketStatus,
} from './tickets.api.js'
import { canManageTicket, canSubmitTicket } from './tickets.policy.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

// ── GET / ─────────────────────────────────────────────────────
router.get('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')

  if (!member || !buildingId) throw Errors.forbidden()

  const role = member.role as UserRole
  const isSyndic = canManageTicket(role)

  if (isSyndic) {
    authorize(role, 'ticket.read.all')
    const tickets = await listTickets(buildingId)
    return c.json(tickets)
  } else {
    authorize(role, 'ticket.read.own')
    const tickets = await listOwnTickets(buildingId, userId)
    return c.json(tickets)
  }
})

// ── POST / ────────────────────────────────────────────────────
const CreateTicketSchema = z.object({
  type:        z.string().min(1),
  title:       z.string().min(1).max(200),
  description: z.string().min(1),
  unit_id:     z.string().uuid().nullable().optional(),
  owner_id:    z.string().uuid().nullable().optional(),
})

router.post('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'ticket.create')
  if (!canSubmitTicket(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = CreateTicketSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  if (!isValidTicketType(parsed.data.type)) throw Errors.badRequest('Invalid ticket type')

  const ticket = await createTicket({
    building_id:     buildingId,
    organization_id: member.organization_id,
    submitted_by:    userId,
    type:            parsed.data.type,
    title:           parsed.data.title,
    description:     parsed.data.description,
    unit_id:         parsed.data.unit_id,
    owner_id:        parsed.data.owner_id,
  })

  await logAudit({
    actor_id:        userId,
    action:          'ticket_create',
    resource_type:   'ticket',
    resource_id:     ticket.id,
    building_id:     buildingId,
    organization_id: member.organization_id,
    metadata:        { title: ticket.title, type: ticket.type },
  })

  return c.json(ticket, 201)
})

// ── PATCH /:id ────────────────────────────────────────────────
const UpdateTicketSchema = z.object({
  title:       z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  status:      z.string().optional(),
})

router.patch('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const ticketId   = c.req.param('id')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'ticket.update')
  if (!canManageTicket(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = UpdateTicketSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  if (parsed.data.status && !isValidTicketStatus(parsed.data.status)) {
    throw Errors.badRequest('Invalid ticket status')
  }

  const updated = await updateTicket(ticketId, buildingId, {
    title:       parsed.data.title,
    description: parsed.data.description,
    status:      parsed.data.status as any,
  })

  await logAudit({
    actor_id:      userId,
    action:        'ticket_update',
    resource_type: 'ticket',
    resource_id:   ticketId,
    building_id:   buildingId,
  })

  return c.json(updated)
})

// ── POST /:id/close ───────────────────────────────────────────
router.post('/:id/close', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const ticketId   = c.req.param('id')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'ticket.close')
  if (!canManageTicket(member.role as UserRole)) throw Errors.forbidden()

  const closed = await closeTicket(ticketId, buildingId)

  await logAudit({
    actor_id:      userId,
    action:        'ticket_update',
    resource_type: 'ticket',
    resource_id:   ticketId,
    building_id:   buildingId,
    metadata:      { status: 'closed' },
  })

  return c.json(closed)
})

export { router as ticketsRouter }
