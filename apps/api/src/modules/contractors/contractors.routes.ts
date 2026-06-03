// ── Contractors routes ────────────────────────────────────────
// Note: contractors are org-level, not building-scoped.
// GET    /api/v1/contractors?building_id=   — list (org-level)
// POST   /api/v1/contractors?building_id=   — create
// PATCH  /api/v1/contractors/:id?building_id=
// DELETE /api/v1/contractors/:id?building_id=

import { Hono } from 'hono'
import { z }    from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }    from '../../shared/authorize.js'
import { Errors }       from '../../shared/errors.js'
import { logAudit }     from '../../shared/logAudit.js'
import {
  listContractors, createContractor, updateContractor, softDeleteContractor,
  isValidTrade,
} from './contractors.api.js'
import { canWriteContractor } from './contractors.policy.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

router.get('/', async (c) => {
  const member = c.get('member')
  if (!member) throw Errors.forbidden()
  authorize(member.role as UserRole, 'contractor.read')

  const contractors = await listContractors(member.organization_id)
  return c.json(contractors)
})

const CreateContractorSchema = z.object({
  name:        z.string().min(1).max(200),
  trade:       z.string().min(1),
  phone:       z.string().max(50).nullable().optional(),
  email:       z.string().max(200).nullable().optional(),
  vat_number:  z.string().max(30).nullable().optional(),
  address:     z.string().nullable().optional(),
  notes:       z.string().nullable().optional(),
  rating:      z.number().int().min(1).max(5).nullable().optional(),
})

router.post('/', async (c) => {
  const userId = c.get('userId')
  const member = c.get('member')
  if (!member) throw Errors.forbidden()
  authorize(member.role as UserRole, 'contractor.create')
  if (!canWriteContractor(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = CreateContractorSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')
  if (!isValidTrade(parsed.data.trade)) throw Errors.badRequest('Invalid trade')

  const { trade: contractorTrade, name: contractorName, ...rest } = parsed.data
  const contractor = await createContractor({
    organization_id: member.organization_id,
    name:            contractorName,
    trade:           contractorTrade as any,
    ...rest,
  })

  await logAudit({
    actor_id:        userId,
    action:          'contractor_create',
    resource_type:   'contractor',
    resource_id:     contractor.id,
    building_id:     c.get('buildingId') ?? undefined,
    organization_id: member.organization_id,
    metadata:        { name: contractor.name, trade: contractor.trade },
  })

  return c.json(contractor, 201)
})

const UpdateContractorSchema = CreateContractorSchema.partial()

router.patch('/:id', async (c) => {
  const userId       = c.get('userId')
  const member       = c.get('member')
  const contractorId = c.req.param('id')
  if (!member) throw Errors.forbidden()
  authorize(member.role as UserRole, 'contractor.update')
  if (!canWriteContractor(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = UpdateContractorSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')
  if (parsed.data.trade && !isValidTrade(parsed.data.trade)) throw Errors.badRequest('Invalid trade')

  const updated = await updateContractor(contractorId, member.organization_id, parsed.data as any)

  await logAudit({
    actor_id:        userId,
    action:          'contractor_update',
    resource_type:   'contractor',
    resource_id:     contractorId,
    organization_id: member.organization_id,
  })

  return c.json(updated)
})

router.delete('/:id', async (c) => {
  const userId       = c.get('userId')
  const member       = c.get('member')
  const contractorId = c.req.param('id')
  if (!member) throw Errors.forbidden()
  authorize(member.role as UserRole, 'contractor.delete')
  if (!canWriteContractor(member.role as UserRole)) throw Errors.forbidden()

  await softDeleteContractor(contractorId, member.organization_id)

  await logAudit({
    actor_id:        userId,
    action:          'contractor_delete',
    resource_type:   'contractor',
    resource_id:     contractorId,
    organization_id: member.organization_id,
  })

  return c.body(null, 204)
})

export { router as contractorsRouter }
