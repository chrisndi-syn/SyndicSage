// ── Insurance routes ──────────────────────────────────────────
// Policies:
//   GET    /api/v1/insurance/policies?building_id=
//   POST   /api/v1/insurance/policies?building_id=
//   PATCH  /api/v1/insurance/policies/:id?building_id=
//   DELETE /api/v1/insurance/policies/:id?building_id=
// Claims:
//   GET    /api/v1/insurance/claims?building_id=[&policy_id=]
//   POST   /api/v1/insurance/claims?building_id=
//   PATCH  /api/v1/insurance/claims/:id?building_id=
//   DELETE /api/v1/insurance/claims/:id?building_id=

import { Hono } from 'hono'
import { z }    from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }    from '../../shared/authorize.js'
import { Errors }       from '../../shared/errors.js'
import { logAudit }     from '../../shared/logAudit.js'
import {
  listInsurancePolicies, createInsurancePolicy, updateInsurancePolicy, softDeleteInsurancePolicy,
  listInsuranceClaims, createInsuranceClaim, updateInsuranceClaim, softDeleteInsuranceClaim,
  isValidPolicyType, isValidClaimStatus,
} from './insurance.api.js'
import { canWriteInsurance } from './insurance.policy.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

// ── POLICIES ──────────────────────────────────────────────────

router.get('/policies', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'insurance_policy.read')

  const policies = await listInsurancePolicies(buildingId)
  return c.json(policies)
})

const CreatePolicySchema = z.object({
  insurer_name:          z.string().min(1).max(200),
  type:                  z.string().min(1),
  policy_number:         z.string().max(100).nullable().optional(),
  description:           z.string().nullable().optional(),
  premium_annual:        z.number().nonnegative().nullable().optional(),
  start_date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  end_date:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  renewal_reminder_days: z.number().int().min(0).optional(),
  document_id:           z.string().uuid().nullable().optional(),
  contact_name:          z.string().max(100).nullable().optional(),
  contact_email:         z.string().max(200).nullable().optional(),
  contact_phone:         z.string().max(50).nullable().optional(),
  notes:                 z.string().nullable().optional(),
})

router.post('/policies', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'insurance_policy.create')
  if (!canWriteInsurance(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = CreatePolicySchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')
  if (!isValidPolicyType(parsed.data.type)) throw Errors.badRequest('Invalid policy type')

  const { type: policyType, insurer_name, ...rest } = parsed.data
  const policy = await createInsurancePolicy({
    building_id:     buildingId,
    organization_id: member.organization_id,
    insurer_name,
    type:            policyType as any,
    ...rest,
  })

  await logAudit({
    actor_id:        userId,
    action:          'insurance_policy_create',
    resource_type:   'insurance_policy',
    resource_id:     policy.id,
    building_id:     buildingId,
    organization_id: member.organization_id,
    metadata:        { insurer_name: policy.insurer_name, type: policy.type },
  })

  return c.json(policy, 201)
})

const UpdatePolicySchema = CreatePolicySchema.partial()

router.patch('/policies/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const policyId   = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'insurance_policy.update')
  if (!canWriteInsurance(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = UpdatePolicySchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')
  if (parsed.data.type && !isValidPolicyType(parsed.data.type)) throw Errors.badRequest('Invalid policy type')

  const updated = await updateInsurancePolicy(policyId, buildingId, parsed.data as any)

  await logAudit({
    actor_id:      userId,
    action:        'insurance_policy_update',
    resource_type: 'insurance_policy',
    resource_id:   policyId,
    building_id:   buildingId,
  })

  return c.json(updated)
})

router.delete('/policies/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const policyId   = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'insurance_policy.delete')
  if (!canWriteInsurance(member.role as UserRole)) throw Errors.forbidden()

  await softDeleteInsurancePolicy(policyId, buildingId)

  await logAudit({
    actor_id:      userId,
    action:        'insurance_policy_delete',
    resource_type: 'insurance_policy',
    resource_id:   policyId,
    building_id:   buildingId,
  })

  return c.body(null, 204)
})

// ── CLAIMS ────────────────────────────────────────────────────

router.get('/claims', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const policyId   = c.req.query('policy_id')
  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'insurance_claim.read')

  const claims = await listInsuranceClaims(buildingId, policyId ?? undefined)
  return c.json(claims)
})

const CreateClaimSchema = z.object({
  policy_id:       z.string().uuid(),
  date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description:     z.string().min(1),
  amount_claimed:  z.number().nonnegative().nullable().optional(),
  amount_received: z.number().nonnegative().nullable().optional(),
  reference:       z.string().max(100).nullable().optional(),
  notes:           z.string().nullable().optional(),
})

router.post('/claims', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'insurance_claim.create')
  if (!canWriteInsurance(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = CreateClaimSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const claim = await createInsuranceClaim({
    building_id:     buildingId,
    organization_id: member.organization_id,
    ...parsed.data,
  })

  await logAudit({
    actor_id:        userId,
    action:          'insurance_claim_create',
    resource_type:   'insurance_claim',
    resource_id:     claim.id,
    building_id:     buildingId,
    organization_id: member.organization_id,
  })

  return c.json(claim, 201)
})

const UpdateClaimSchema = z.object({
  date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description:     z.string().min(1).optional(),
  amount_claimed:  z.number().nonnegative().nullable().optional(),
  amount_received: z.number().nonnegative().nullable().optional(),
  status:          z.string().optional(),
  reference:       z.string().max(100).nullable().optional(),
  notes:           z.string().nullable().optional(),
})

router.patch('/claims/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const claimId    = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'insurance_claim.update')
  if (!canWriteInsurance(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = UpdateClaimSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')
  if (parsed.data.status && !isValidClaimStatus(parsed.data.status)) throw Errors.badRequest('Invalid claim status')

  const updated = await updateInsuranceClaim(claimId, buildingId, parsed.data as any)

  await logAudit({
    actor_id:      userId,
    action:        'insurance_claim_update',
    resource_type: 'insurance_claim',
    resource_id:   claimId,
    building_id:   buildingId,
  })

  return c.json(updated)
})

router.delete('/claims/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  const claimId    = c.req.param('id')
  if (!member || !buildingId) throw Errors.forbidden()
  authorize(member.role as UserRole, 'insurance_claim.delete')
  if (!canWriteInsurance(member.role as UserRole)) throw Errors.forbidden()

  await softDeleteInsuranceClaim(claimId, buildingId)

  await logAudit({
    actor_id:      userId,
    action:        'insurance_claim_delete',
    resource_type: 'insurance_claim',
    resource_id:   claimId,
    building_id:   buildingId,
  })

  return c.body(null, 204)
})

export { router as insuranceRouter }
