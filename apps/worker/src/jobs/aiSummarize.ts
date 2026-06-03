// ── AI Summarize worker job ────────────────────────────────────
// Triggered after document upload (scan_file job passes).
// Reads document text from storage, generates summary via AI Gateway,
// stores in document_ai_summaries with building_id for tenant scoping.

import { createClient } from '@supabase/supabase-js'
import Anthropic        from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env['SUPABASE_URL']          ?? '',
  process.env['SUPABASE_SERVICE_ROLE'] ?? '',
)

const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] ?? '' })

interface AiSummarizePayload {
  document_id:  string
  building_id:  string
  storage_path: string
  building_name: string
}

export async function handleAiSummarize(payload: Record<string, unknown>) {
  const { document_id, building_id, storage_path, building_name } = payload as unknown as AiSummarizePayload

  if (!document_id || !building_id || !storage_path) {
    console.warn('[aiSummarize] missing required fields — skipping')
    return
  }

  // Download file from private storage
  const { data: fileData, error: downloadErr } = await supabase.storage
    .from('documents')
    .download(storage_path)

  if (downloadErr || !fileData) {
    console.error('[aiSummarize] download failed:', downloadErr?.message)
    return
  }

  // Convert to text — for now treat as plain text (PDF text extraction deferred to Phase 5)
  const text = await fileData.text().catch(() => '')
  if (!text.trim()) {
    console.warn('[aiSummarize] document has no extractable text — skipping')
    return
  }

  // Generate summary — instructions in system, document content in user
  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 512,
    system: [
      'You are a document summarization assistant for a Belgian VME co-ownership association.',
      `Building: ${building_name}.`,
      'Produce a concise 2-4 sentence summary. Plain text only.',
    ].join(' '),
    messages: [{ role: 'user', content: text.slice(0, 8000) }],
  })

  const summary = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  if (!summary) return

  await supabase.from('document_ai_summaries').insert({
    document_id,
    building_id,
    summary,
    model:    'claude-sonnet-4-6',
    provider: 'anthropic',
  })

  console.log(`[aiSummarize] ✓ document ${document_id}`)
}
