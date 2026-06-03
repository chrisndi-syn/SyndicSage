// ── Supplier Contracts routes ─────────────────────────────────
// GET    /api/v1/supplier-contracts?building_id=
// POST   /api/v1/supplier-contracts?building_id=
// PATCH  /api/v1/supplier-contracts/:id?building_id=
// DELETE /api/v1/supplier-contracts/:id?building_id=

import { Hono } from 'hono'
import { z }    from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }    from '../../shared/authorize.js'
import { Errors }       from '../../shared/errors.js'
import { logAudit }     from '../../shared/logAudit.js'
import {
  listSupplierContracts, createSupplierContract, updateSupplierContract, softDeleteSupplierContract,
  isValidContractStatus,
} from './supplierContracts.api.js'
import { canWriteSupplierContract } from './supplierContracts.policy.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

router.get('/', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'supplier_contract.read')

  const contracts = await listSupplierContracts(buildingId)
  return c.json(contracts)
})

const CreateContractSchema = z.object({
  contractor_id:         z.string().uuid(),
  title:                 z.string().min(1).max(200),
  description:           z.string().nullable().optional(),
  start_date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  end_date:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  amount_annual:         z.number().nonnegative().nullable().optional(),
  document_id:           z.string().uuid().nullable().optional(),
  renewal_reminder_days: z.number().int().min(0).optional(),
  notes:                 z.string().nullable().optional(),
})

router.post('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'supplier_contract.create')
  if (!canWriteSupplierContract(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = CreateContractSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const contract = await createSupplierContract({
    building_id:     buildingId,
    organization_id: member.organization_id,
    ...parsed.data,
  })

  await logAudit({
    actor_id:        userId,
    action:          'supplier_contract_create',
    resource_type:   'supplier_contract',
    resource_id:     contract.id,
    building_id:     buildingId,
    organization_id: member.organization_id,
    metadata:        { title: contract.title },
  })

  return c.json(contract, 201)
})

const UpdateContractSchema = z.object({
  contractor_id:         z.string().uuid().optional(),
  title:                 z.string().min(1).max(200).optional(),
  description:           z.string().nullable().optional(),
  start_date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  end_date:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  amount_annual:         z.number().nonnegative().nullable().optional(),
  status:                z.string().optional(),
  document_id:           z.string().uuid().nullable().optional(),
  renewal_reminder_days: z.number().int().min(0).optional(),
  notes:                 z.string().nullable().optional(),
})

router.patch('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const contractId = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'supplier_contract.update')
  if (!canWriteSupplierContract(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = UpdateContractSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')
  if (parsed.data.status && !isValidContractStatus(parsed.data.status)) throw Errors.badRequest('Invalid status')

  const updated = await updateSupplierContract(contractId, buildingId, parsed.data as any)

  await logAudit({
    actor_id:      userId,
    action:        'supplier_contract_update',
    resource_type: 'supplier_contract',
    resource_id:   contractId,
    building_id:   buildingId,
  })

  return c.json(updated)
})

router.delete('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const contractId = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'supplier_contract.delete')
  if (!canWriteSupplierContract(member.role as UserRole)) throw Errors.forbidden()

  await softDeleteSupplierContract(contractId, buildingId)

  await logAudit({
    actor_id:      userId,
    action:        'supplier_contract_delete',
    resource_type: 'supplier_contract',
    resource_id:   contractId,
    building_id:   buildingId,
  })

  return c.body(null, 204)
})

export { router as supplierContractsRouter }
