// ── AI routes ─────────────────────────────────────────────────
// POST /api/v1/ai/chat                   — AI Sage conversational chat
// POST /api/v1/ai/suggest-accounting-code — Haiku accounting code suggestion

import { Hono } from 'hono'
import { z }    from 'zod'
import type { UserRole } from '@syndicsage/types'
import { authorize }        from '../../shared/authorize.js'
import { Errors }           from '../../shared/errors.js'
import { getSupabaseAdmin } from '../../shared/supabaseAdmin.js'
import { chatCompletion, suggestAccountingCode } from './gateway.js'

type Variables = {
  userId:     string
  buildingId: string | null
  member:     { id: string; role: string; unit_id: string | null; building_id: string; organization_id: string } | undefined
}

const router = new Hono<{ Variables: Variables }>()

// ── POST /chat ────────────────────────────────────────────────
// AI Sage: multi-turn chat scoped to the user's building context.
// History is persisted in ai_conversations + ai_messages.

const ChatInput = z.object({
  message:         z.string().min(1).max(4000),
  conversation_id: z.string().uuid().optional(),
})

router.post('/chat', async (c) => {
  const userId     = c.get('userId')
  const member     = c.get('member')
  const buildingId = c.get('buildingId')

  if (!member) throw Errors.forbidden()

  const role = member.role as UserRole
  authorize(role, 'ai.chat')

  const body   = await c.req.json().catch(() => null)
  const parsed = ChatInput.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { message, conversation_id } = parsed.data
  const supabase = getSupabaseAdmin()

  // ── Get or create conversation ──────────────────────────────
  let convId = conversation_id

  if (!convId) {
    const { data: conv, error: convErr } = await supabase
      .from('ai_conversations')
      .insert({
        user_id:         userId,
        organization_id: member.organization_id,
        building_id:     buildingId ?? null,
      })
      .select('id')
      .single()

    if (convErr || !conv) throw Errors.internal()
    convId = conv.id as string
  }

  // ── Load recent history (last 10 messages) ──────────────────
  const { data: history = [] } = await supabase
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: false })
    .limit(10)

  const historyMessages = (history as { role: string; content: string }[])
    .reverse()
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  // ── Fetch building context for system prompt ────────────────
  let buildingContext = ''
  if (buildingId) {
    const { data: building } = await supabase
      .from('buildings')
      .select('name, address, unit_count')
      .eq('id', buildingId)
      .single()

    if (building) {
      buildingContext = `Building: ${(building as { name: string; address: string | null; unit_count: number }).name}, ${(building as { name: string; address: string | null; unit_count: number }).unit_count} units.`
    }
  }

  // ── System prompt — instructions only, no user data ─────────
  const systemPrompt = [
    'You are AI Sage, an intelligent assistant for Belgian VME (co-ownership association) syndics.',
    'You help with: Belgian VME law questions, charge management, document drafting, meeting preparation, and building administration.',
    buildingContext,
    'Be concise and practical. Always note when something requires legal advice from a notary or lawyer.',
    'Respond in the same language as the user message (French, Dutch, or English).',
  ].filter(Boolean).join(' ')

  // ── All messages (history + new) go in `messages`, not system ─
  const messages = [...historyMessages, { role: 'user' as const, content: message }]

  // ── Call AI ─────────────────────────────────────────────────
  const result = await chatCompletion(messages, systemPrompt).catch((err: unknown) => {
    console.error('[ai/chat] gateway error:', err)
    throw Errors.internal()
  })

  // ── Persist messages ─────────────────────────────────────────
  await supabase.from('ai_messages').insert([
    { conversation_id: convId, role: 'user',      content: message,         token_count: null },
    { conversation_id: convId, role: 'assistant', content: result.content,  token_count: result.outputTokens, model: 'claude-sonnet-4-6' },
  ])

  return c.json({
    conversation_id: convId,
    message:         result.content,
    usage: {
      input_tokens:  result.inputTokens,
      output_tokens: result.outputTokens,
    },
  })
})

// ── POST /suggest-accounting-code ─────────────────────────────
// Uses Haiku to suggest a Belgian accounting code from description + supplier.
// Returns a suggestion with confidence — syndic MUST confirm before saving.

const SuggestInput = z.object({
  description:   z.string().min(1).max(500),
  supplier_name: z.string().max(200).optional().default(''),
})

router.post('/suggest-accounting-code', async (c) => {
  const member = c.get('member')
  if (!member) throw Errors.forbidden()

  const role = member.role as UserRole
  authorize(role, 'ai.suggest')

  const body   = await c.req.json().catch(() => null)
  const parsed = SuggestInput.safeParse(body)
  if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')

  const suggestion = await suggestAccountingCode(
    parsed.data.description,
    parsed.data.supplier_name,
  ).catch((err: unknown) => {
    console.error('[ai/suggest] gateway error:', err)
    throw Errors.internal()
  })

  return c.json({
    suggestion,
    disclaimer: 'This is an AI suggestion only. Please verify before saving.',
  })
})

export { router as aiRouter }
