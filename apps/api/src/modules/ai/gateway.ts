// ── AI Gateway — provider adapter ─────────────────────────────
//
// Architecture rules (locked):
// • All AI calls route through here — features never call Anthropic directly
// • S2 rule enforced: instructions in `system`, user-controlled data in `user`
// • Swap providers by changing this file only — zero feature changes needed
//
// Current provider: Anthropic
// Models:
//   claude-sonnet-4-6   — AI Sage chat, extraction (balanced)
//   claude-haiku-4-5-20251001  — accounting code suggestion (fast + cheap)

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
})

export interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

// ── Chat completion ───────────────────────────────────────────
// Used by AI Sage. System prompt contains only instructions.
// All user-controlled data (building context, history) goes in messages.
export async function chatCompletion(
  messages:     ChatMessage[],
  systemPrompt: string,
  model = 'claude-sonnet-4-6',
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system:   systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  })

  const content = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  return {
    content,
    inputTokens:  response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}

// ── Document summarization ────────────────────────────────────
// documentText must NOT be interpolated into the system prompt.
export async function summarizeDocument(
  documentText: string,
  buildingName: string,
): Promise<string> {
  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 512,
    system: [
      'You are a document summarization assistant for a Belgian VME (co-ownership association).',
      `Building context: ${buildingName}.`,
      'Produce a concise 2-4 sentence summary of the document. Output plain text only.',
    ].join(' '),
    messages: [{ role: 'user', content: documentText }],
  })

  return response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
}

// ── Structured extraction ─────────────────────────────────────
// Returns a JSON object extracted from the document text.
export async function extractFromDocument(
  documentText: string,
  fieldsDescription: string,
): Promise<Record<string, unknown>> {
  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      'You are a structured data extraction assistant for Belgian VME management.',
      `Extract these fields: ${fieldsDescription}.`,
      'Respond ONLY with valid JSON — no explanation, no markdown.',
    ].join(' '),
    messages: [{ role: 'user', content: documentText }],
  })

  const raw = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return { raw_output: raw }
  }
}

// ── Accounting code suggestion ────────────────────────────────
// Uses Haiku — fast, cheap, accurate enough for code lookups.
// Returns { code, label, confidence } — always a suggestion, never authoritative.
export async function suggestAccountingCode(
  description: string,
  supplierName: string,
): Promise<{ code: string; label: string; confidence: number }> {
  const response = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 128,
    system: [
      'You are a Belgian VME accounting assistant.',
      'Map expense descriptions to Belgian accounting codes.',
      'Common codes: 61043 Electricity, 61050 Water, 61210 Maintenance/Repairs, 61220 Cleaning,',
      '61300 Insurance, 61400 Admin/Postage, 61500 Management fees, 61600 Elevator,',
      '61700 Cleaning materials, 61800 Urgent repairs, 6740 Accountant fees,',
      '6750 Legal fees, 6900 Depreciation, 4999 Other.',
      'Respond ONLY with JSON: {"code":"61210","label":"Maintenance/Repairs","confidence":0.9}',
    ].join(' '),
    messages: [{
      role: 'user',
      content: `Description: ${description}\nSupplier: ${supplierName}`,
    }],
  })

  const raw = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  try {
    const parsed = JSON.parse(raw) as { code: string; label: string; confidence: number }
    return {
      code:       String(parsed.code ?? '4999'),
      label:      String(parsed.label ?? 'Other'),
      confidence: Number(parsed.confidence ?? 0.5),
    }
  } catch {
    return { code: '4999', label: 'Other', confidence: 0 }
  }
}

// ── Embeddings ────────────────────────────────────────────────
// Returns a 1536-dim embedding using text-embedding-3-small via OpenAI
// compatible format. For now returns a zero vector as placeholder —
// swap for a real embedding call when OpenAI or Voyage is configured.
// The architecture (pgvector table + worker job) is already wired.
export async function generateEmbedding(text: string): Promise<number[]> {
  // NOTE: Anthropic does not yet offer embeddings. This placeholder
  // will be swapped for Voyage AI or OpenAI when configured.
  // Worker job handles retry + dead-letter queue.
  console.log('[gateway] generateEmbedding called for text length:', text.length)
  return new Array(1536).fill(0) as number[]
}
