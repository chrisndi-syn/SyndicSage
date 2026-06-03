// ── AI Extract worker job ──────────────────────────────────────
// Extracts structured fields from a document (invoice amounts, dates,
// supplier names, etc.). Stores in document_ai_extractions with
// validated_at = NULL — syndic must confirm before it becomes official.

import { createClient } from '@supabase/supabase-js'
import Anthropic        from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env['SUPABASE_URL']          ?? '',
  process.env['SUPABASE_SERVICE_ROLE'] ?? '',
)

const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] ?? '' })

interface AiExtractPayload {
  document_id:  string
  building_id:  string
  storage_path: string
  fields:       string   // e.g. "supplier_name, invoice_date, total_amount, vat_number"
}

export async function handleAiExtract(payload: Record<string, unknown>) {
  const { document_id, building_id, storage_path, fields } = payload as unknown as AiExtractPayload

  if (!document_id || !building_id || !storage_path) {
    console.warn('[aiExtract] missing required fields — skipping')
    return
  }

  const { data: fileData, error: downloadErr } = await supabase.storage
    .from('documents')
    .download(storage_path)

  if (downloadErr || !fileData) {
    console.error('[aiExtract] download failed:', downloadErr?.message)
    return
  }

  const text = await fileData.text().catch(() => '')
  if (!text.trim()) {
    console.warn('[aiExtract] no extractable text — skipping')
    return
  }

  const fieldsDesc = fields ?? 'supplier_name, invoice_date, total_amount_eur, vat_number, reference'

  // S2: instructions in system, document content in user message
  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      'You are a structured data extraction assistant for Belgian VME management documents.',
      `Extract these fields: ${fieldsDesc}.`,
      'Respond ONLY with valid JSON — no explanation, no markdown code blocks.',
    ].join(' '),
    messages: [{ role: 'user', content: text.slice(0, 8000) }],
  })

  const raw = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  let extractedData: Record<string, unknown>
  try {
    extractedData = JSON.parse(raw) as Record<string, unknown>
  } catch {
    extractedData = { raw_output: raw }
  }

  await supabase.from('document_ai_extractions').insert({
    document_id,
    building_id,
    extracted_data: extractedData,
    model:          'claude-sonnet-4-6',
    provider:       'anthropic',
    confidence:     null,
    validated_by:   null,
    validated_at:   null,
  })

  console.log(`[aiExtract] ✓ document ${document_id}`)
}
