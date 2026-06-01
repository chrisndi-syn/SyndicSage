// ── Owners routes ─────────────────────────────────────────────
// POST   /api/v1/owners?building_id=  — create owner + unit
// PATCH  /api/v1/owners/:ownerId?building_id= — update owner
// DELETE /api/v1/owners/:ownerId?building_id= — soft-delete owner

import { Hono } from 'hono'
import { z }    from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }    from '../../shared/authorize.js'
import { Errors }       from '../../shared/errors.js'
import { logAudit }     from '../../shared/logAudit.js'
import {
  createOwnerWithUnit, updateOwner, softDeleteOwner,
} from './owners.api.js'
import { canManageOwners, canDeleteOwner } from './owners.policy.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

const UNIT_TYPES = ['apartment', 'parking', 'storage', 'commercial', 'other'] as const

// ── POST / ────────────────────────────────────────────────────
const CreateOwnerSchema = z.object({
  unit_number:        z.string().min(1).max(20),
  unit_type:          z.enum(UNIT_TYPES),
  ownership_share:    z.number().positive(),
  full_name:          z.string().min(1).max(100),
  email:              z.string().max(254).optional(),
  phone:              z.string().optional(),
  is_renter:          z.boolean(),
  has_no_email:       z.boolean().optional(),
  bank_account:       z.string().max(34).nullable().optional(),
  preferred_language: z.enum(['en', 'fr', 'nl']).optional(),
  mailing_address:    z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (!data.has_no_email && !data.email) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Email required unless has_no_email is true' })
  }
  if (data.email && data.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Invalid email address' })
  }
})

router.post('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'owner.create')
  if (!canManageOwners(member.role as UserRole)) throw Errors.forbidden()

  const body = await c.req.json()
  const parsed = CreateOwnerSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const owner = await createOwnerWithUnit({ building_id: buildingId, ...parsed.data })

  await logAudit({
    actor_id:      userId,
    action:        'owner_add',
    resource_type: 'owner',
    resource_id:   owner.id,
    building_id:   buildingId,
    metadata:      { full_name: owner.full_name, unit: parsed.data.unit_number },
  })

  return c.json(owner, 201)
})

// ── PATCH /:ownerId ───────────────────────────────────────────
const UpdateOwnerSchema = z.object({
  full_name:          z.string().min(1).max(100).optional(),
  email:              z.string().max(254).optional(),
  phone:              z.string().nullable().optional(),
  is_renter:          z.boolean().optional(),
  bank_account:       z.string().max(34).nullable().optional(),
  preferred_language: z.enum(['en','fr','nl']).optional(),
  mailing_address:    z.string().nullable().optional(),
  has_no_email:       z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.has_no_email === false && data.email !== undefined && data.email.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Email required when has_no_email is false' })
  }
  if (data.email && data.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Invalid email address' })
  }
})

router.patch('/:ownerId', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const ownerId    = c.req.param('ownerId')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'owner.update')
  if (!canManageOwners(member.role as UserRole)) throw Errors.forbidden()

  const body = await c.req.json()
  const parsed = UpdateOwnerSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const updated = await updateOwner(ownerId, buildingId, parsed.data)

  await logAudit({
    actor_id:      userId,
    action:        'owner_add',    // reuse; no separate 'owner_edit' in schema
    resource_type: 'owner',
    resource_id:   ownerId,
    building_id:   buildingId,
  })

  return c.json(updated)
})

// ── DELETE /:ownerId ──────────────────────────────────────────
router.delete('/:ownerId', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const ownerId    = c.req.param('ownerId')

  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'owner.delete')
  if (!canDeleteOwner(member.role as UserRole)) throw Errors.forbidden()

  await softDeleteOwner(ownerId, buildingId)

  await logAudit({
    actor_id:      userId,
    action:        'owner_remove',
    resource_type: 'owner',
    resource_id:   ownerId,
    building_id:   buildingId,
  })

  return c.body(null, 204)
})

export { router as ownersRouter }
