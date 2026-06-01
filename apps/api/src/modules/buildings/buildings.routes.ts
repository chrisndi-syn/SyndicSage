// ── Buildings routes ──────────────────────────────────────────
// POST   /api/v1/buildings              — create building (org-level)
// PATCH  /api/v1/buildings/:buildingId  — update building
// DELETE /api/v1/buildings/:buildingId  — soft-delete building
// DELETE /api/v1/buildings/:buildingId/members/:memberId — offboard member (7b)
// GET    /api/v1/buildings/:buildingId/members — list members

import { Hono }   from 'hono'
import { z }      from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize } from '../../shared/authorize.js'
import { Errors }    from '../../shared/errors.js'
import { logAudit }  from '../../shared/logAudit.js'
import {
  getOrgForUser, userIsSyndicInOrg,
  createBuilding, updateBuilding, softDeleteBuilding,
  getMember, removeMemberFromBuilding, revokeUserSessions,
  getBuildingMembers,
} from './buildings.api.js'
import {
  canDeleteBuilding, canRemoveMember, canUpdateBuilding,
} from './buildings.policy.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

// ── POST / — create building ──────────────────────────────────
const CreateBuildingSchema = z.object({
  name:       z.string().min(1).max(200),
  address:    z.string().min(1),
  city:       z.string().min(1),
  unit_count: z.number().int().positive(),
})

router.post('/', async (c) => {
  const userId = c.get('userId')

  // Org-level route: verify user is an established syndic
  const isSyndic = await userIsSyndicInOrg(userId)
  if (!isSyndic) throw Errors.forbidden()

  const body = await c.req.json()
  const parsed = CreateBuildingSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const org = await getOrgForUser(userId)
  const building = await createBuilding({ organization_id: org.id, ...parsed.data }, userId)

  await logAudit({
    actor_id:        userId,
    action:          'building_create',
    resource_type:   'building',
    resource_id:     building.id,
    organization_id: org.id,
  })

  return c.json(building, 201)
})

// ── PATCH /:buildingId — update building ──────────────────────
const UpdateBuildingSchema = z.object({
  name:       z.string().min(1).max(200).optional(),
  address:    z.string().min(1).optional(),
  city:       z.string().min(1).optional(),
  unit_count: z.number().int().positive().optional(),
  vme_number: z.string().nullable().optional(),
})

router.patch('/:buildingId', async (c) => {
  const userId   = c.get('userId')
  const member   = c.get('member')
  const buildingId = c.get('buildingId')!

  if (!member) throw Errors.forbidden()
  authorize(member.role as UserRole, 'building.update')
  if (!canUpdateBuilding(member.role as UserRole)) throw Errors.forbidden()

  const body = await c.req.json()
  const parsed = UpdateBuildingSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const updated = await updateBuilding(buildingId, parsed.data)

  await logAudit({
    actor_id:      userId,
    action:        'building_update',
    resource_type: 'building',
    resource_id:   buildingId,
    building_id:   buildingId,
  })

  return c.json(updated)
})

// ── DELETE /:buildingId — soft-delete building ────────────────
router.delete('/:buildingId', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')!

  if (!member) throw Errors.forbidden()
  authorize(member.role as UserRole, 'building.delete')
  if (!canDeleteBuilding(member.role as UserRole)) throw Errors.forbidden()

  await softDeleteBuilding(buildingId)

  await logAudit({
    actor_id:      userId,
    action:        'building_delete',
    resource_type: 'building',
    resource_id:   buildingId,
    building_id:   buildingId,
  })

  return c.body(null, 204)
})

// ── GET /:buildingId/members — list members ───────────────────
router.get('/:buildingId/members', async (c) => {
  const member = c.get('member')
  const buildingId = c.get('buildingId')!

  if (!member) throw Errors.forbidden()
  authorize(member.role as UserRole, 'member.read')

  const members = await getBuildingMembers(buildingId)
  return c.json(members)
})

// ── DELETE /:buildingId/members/:memberId — offboard member ───
router.delete('/:buildingId/members/:memberId', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')!
  const memberId   = c.req.param('memberId')

  if (!member) throw Errors.forbidden()
  authorize(member.role as UserRole, 'member.remove')

  const target = await getMember(buildingId, memberId)

  if (!canRemoveMember(member.role as UserRole, userId, target.user_id)) {
    throw Errors.forbidden()
  }

  // Block removing the last syndic
  if (target.role === 'syndic') {
    const allMembers = await getBuildingMembers(buildingId)
    const syndics = allMembers.filter(m => m.role === 'syndic')
    if (syndics.length <= 1) {
      throw Errors.badRequest('Cannot remove the last syndic from a building')
    }
  }

  await removeMemberFromBuilding(memberId)
  await revokeUserSessions(target.user_id)

  await logAudit({
    actor_id:      userId,
    action:        'member_remove',
    resource_type: 'building_member',
    resource_id:   memberId,
    building_id:   buildingId,
    metadata:      { removed_user_id: target.user_id, role: target.role },
  })

  return c.body(null, 204)
})

export { router as buildingsRouter }
