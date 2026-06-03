// ── Letter Templates routes ───────────────────────────────────
// GET    /api/v1/letter-templates?building_id=
// POST   /api/v1/letter-templates?building_id=
// PATCH  /api/v1/letter-templates/:id?building_id=
// DELETE /api/v1/letter-templates/:id?building_id=
// POST   /api/v1/letter-templates/:id/render?building_id=  — render with variables

import { Hono } from 'hono'
import { z }    from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }    from '../../shared/authorize.js'
import { Errors }       from '../../shared/errors.js'
import { logAudit }     from '../../shared/logAudit.js'
import {
  listLetterTemplates, createLetterTemplate, updateLetterTemplate, softDeleteLetterTemplate,
  renderTemplate, isValidTemplateCategory,
} from './letterTemplates.api.js'
import { canWriteTemplate } from './letterTemplates.policy.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

router.get('/', async (c) => {
  const member     = c.get('member')
  const buildingId = c.get('buildingId')
  if (!member) throw Errors.forbidden()
  authorize(member.role as UserRole, 'letter_template.read')

  const templates = await listLetterTemplates(member.organization_id, buildingId ?? undefined)
  return c.json(templates)
})

const CreateTemplateSchema = z.object({
  name:        z.string().min(1).max(200),
  category:    z.string().min(1),
  body_html:   z.string().min(1),
  variables:   z.array(z.string()).optional(),
  building_id: z.string().uuid().nullable().optional(),
})

router.post('/', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  if (!member) throw Errors.forbidden()
  authorize(member.role as UserRole, 'letter_template.create')
  if (!canWriteTemplate(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = CreateTemplateSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')
  if (!isValidTemplateCategory(parsed.data.category)) throw Errors.badRequest('Invalid category')

  const template = await createLetterTemplate({
    organization_id: member.organization_id,
    building_id:     parsed.data.building_id,
    name:            parsed.data.name,
    category:        parsed.data.category,
    body_html:       parsed.data.body_html,
    variables:       parsed.data.variables,
  })

  await logAudit({
    actor_id:        userId,
    action:          'letter_template_create',
    resource_type:   'letter_template',
    resource_id:     template.id,
    organization_id: member.organization_id,
    metadata:        { name: template.name, category: template.category },
  })

  return c.json(template, 201)
})

const UpdateTemplateSchema = z.object({
  name:      z.string().min(1).max(200).optional(),
  category:  z.string().optional(),
  body_html: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
})

router.patch('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const templateId = c.req.param('id')
  if (!member) throw Errors.forbidden()
  authorize(member.role as UserRole, 'letter_template.update')
  if (!canWriteTemplate(member.role as UserRole)) throw Errors.forbidden()

  const body   = await c.req.json()
  const parsed = UpdateTemplateSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')
  if (parsed.data.category && !isValidTemplateCategory(parsed.data.category)) {
    throw Errors.badRequest('Invalid category')
  }

  const updated = await updateLetterTemplate(templateId, member.organization_id, parsed.data as any)

  await logAudit({
    actor_id:        userId,
    action:          'letter_template_update',
    resource_type:   'letter_template',
    resource_id:     templateId,
    organization_id: member.organization_id,
  })

  return c.json(updated)
})

router.delete('/:id', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const templateId = c.req.param('id')
  if (!member) throw Errors.forbidden()
  authorize(member.role as UserRole, 'letter_template.delete')
  if (!canWriteTemplate(member.role as UserRole)) throw Errors.forbidden()

  await softDeleteLetterTemplate(templateId, member.organization_id)

  await logAudit({
    actor_id:        userId,
    action:          'letter_template_delete',
    resource_type:   'letter_template',
    resource_id:     templateId,
    organization_id: member.organization_id,
  })

  return c.body(null, 204)
})

// ── POST /:id/render ──────────────────────────────────────────
const RenderSchema = z.object({
  variables: z.record(z.string()),
})

router.post('/:id/render', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const templateId = c.req.param('id')
  if (!member) throw Errors.forbidden()
  authorize(member.role as UserRole, 'letter_template.render')

  const body   = await c.req.json()
  const parsed = RenderSchema.safeParse(body)
  if (!parsed.success) throw Errors.badRequest('variables must be an object of string key→value pairs')

  // Fetch template
  const templates = await listLetterTemplates(member.organization_id, c.get('buildingId') ?? undefined)
  const template  = templates.find(t => t.id === templateId)
  if (!template) throw Errors.notFound('LetterTemplate')

  const rendered = renderTemplate(template, parsed.data.variables)

  await logAudit({
    actor_id:        userId,
    action:          'letter_template_render',
    resource_type:   'letter_template',
    resource_id:     templateId,
    organization_id: member.organization_id,
  })

  return c.json({ html: rendered })
})

export { router as letterTemplatesRouter }
